import { formatEther, parseEther, type PublicClient } from 'viem';
import { CAMPAIGN_FACTORY_ADDRESS, USER_REGISTRY_ADDRESS } from './contracts';

const USER_REGISTRY_EVENTS = [
  {
    type: 'event',
    name: 'DonationRecorded',
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: true, name: 'campaign', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
] as const;

const CAMPAIGN_EVENTS = [
  {
    type: 'event',
    name: 'RefundIssued',
    inputs: [
      { indexed: true, name: 'contributor', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
  },
] as const;

const FACTORY_EVENTS = [
  {
    type: 'event',
    name: 'CampaignCreated',
    inputs: [
      { indexed: true, name: 'campaignAddress', type: 'address' },
      { indexed: true, name: 'creator', type: 'address' },
      { indexed: false, name: 'title', type: 'string' },
      { indexed: false, name: 'fundingTarget', type: 'uint256' },
      { indexed: false, name: 'durationInDays', type: 'uint256' },
    ],
  },
] as const;

type DonationRow = {
  donor_address?: string | null;
  campaign_address?: string | null;
  amount_eth?: string | number | null;
  tx_hash?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

type RefundRow = {
  user_address?: string | null;
  campaign_address?: string | null;
  amount_eth?: string | number | null;
  amount?: string | number | null;
  tx_hash?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

function toIsoFromBlockTimestamp(timestamp?: bigint) {
  if (timestamp === undefined) {
    return null;
  }

  return new Date(Number(timestamp) * 1000).toISOString();
}

function toWeiString(value?: string | number | null) {
  if (value === null || value === undefined) {
    return '0';
  }

  try {
    return parseEther(String(value)).toString();
  } catch {
    return '0';
  }
}

function makeCompositeKey(...parts: Array<string | null | undefined>) {
  return parts.map((part) => String(part ?? '').toLowerCase()).join('|');
}

async function getBlockTimestampMap(publicClient: PublicClient, blockNumbers: bigint[]) {
  const uniqueBlockNumbers = Array.from(new Set(blockNumbers.map((blockNumber) => blockNumber.toString()))).map((value) => BigInt(value));
  const blockResults = await Promise.all(
    uniqueBlockNumbers.map(async (blockNumber) => {
      const block = await publicClient.getBlock({ blockNumber });
      return [blockNumber.toString(), toIsoFromBlockTimestamp(block.timestamp)] as const;
    }),
  );

  return new Map(blockResults);
}

export async function enrichDonationRowsWithChainTimestamps(publicClient: PublicClient, rows: DonationRow[]) {
  if (rows.length === 0) {
    return rows;
  }

  const logs = await publicClient.getLogs({
    address: USER_REGISTRY_ADDRESS,
    event: USER_REGISTRY_EVENTS[0],
    fromBlock: 0n,
    toBlock: 'latest',
  });

  const txHashMap = new Map<string, { created_at: string | null; tx_hash: string }>();
  const groupedEvents = new Map<string, Array<{ created_at: string | null; tx_hash: string }>>();

  for (const log of logs) {
    const eventTimestamp = toIsoFromBlockTimestamp(log.args.timestamp);
    const txHash = log.transactionHash;
    const amountWei = log.args.amount?.toString() ?? '0';
    const compositeKey = makeCompositeKey(log.args.user, log.args.campaign, amountWei);
    const entry = { created_at: eventTimestamp, tx_hash: txHash };

    txHashMap.set(txHash.toLowerCase(), entry);

    const existing = groupedEvents.get(compositeKey) ?? [];
    existing.push(entry);
    groupedEvents.set(compositeKey, existing);
  }

  return rows.map((row) => {
    const txHash = row.tx_hash?.toLowerCase();
    const byTxHash = txHash ? txHashMap.get(txHash) : undefined;

    if (byTxHash) {
      return {
        ...row,
        created_at: byTxHash.created_at ?? row.created_at ?? null,
        tx_hash: row.tx_hash ?? byTxHash.tx_hash,
      };
    }

    const compositeKey = makeCompositeKey(row.donor_address, row.campaign_address, toWeiString(row.amount_eth));
    const candidates = groupedEvents.get(compositeKey);
    const matched = candidates?.shift();

    return {
      ...row,
      created_at: matched?.created_at ?? row.created_at ?? null,
      tx_hash: row.tx_hash ?? matched?.tx_hash ?? null,
    };
  });
}

export async function enrichRefundRowsWithChainTimestamps(publicClient: PublicClient, rows: RefundRow[]) {
  if (rows.length === 0) {
    return rows;
  }

  const campaignAddresses = Array.from(
    new Set(rows.map((row) => row.campaign_address).filter(Boolean)),
  ) as `0x${string}`[];

  if (campaignAddresses.length === 0) {
    return rows;
  }

  const nestedLogs = await Promise.all(
    campaignAddresses.map((campaignAddress) =>
      publicClient.getLogs({
        address: campaignAddress,
        event: CAMPAIGN_EVENTS[0],
        fromBlock: 0n,
        toBlock: 'latest',
      }),
    ),
  );

  const logs = nestedLogs.flat();
  const blockTimestampMap = await getBlockTimestampMap(
    publicClient,
    logs.map((log) => log.blockNumber),
  );

  const txHashMap = new Map<string, { created_at: string | null; tx_hash: string }>();
  const groupedEvents = new Map<string, Array<{ created_at: string | null; tx_hash: string }>>();

  for (const log of logs) {
    const eventTimestamp = blockTimestampMap.get(log.blockNumber.toString()) ?? null;
    const txHash = log.transactionHash;
    const amountWei = log.args.amount?.toString() ?? '0';
    const compositeKey = makeCompositeKey(log.address, log.args.contributor, amountWei);
    const entry = { created_at: eventTimestamp, tx_hash: txHash };

    txHashMap.set(txHash.toLowerCase(), entry);

    const existing = groupedEvents.get(compositeKey) ?? [];
    existing.push(entry);
    groupedEvents.set(compositeKey, existing);
  }

  return rows.map((row) => {
    const txHash = row.tx_hash?.toLowerCase();
    const byTxHash = txHash ? txHashMap.get(txHash) : undefined;

    if (byTxHash) {
      return {
        ...row,
        created_at: byTxHash.created_at ?? row.created_at ?? null,
        tx_hash: row.tx_hash ?? byTxHash.tx_hash,
      };
    }

    const amountValue = row.amount_eth ?? row.amount ?? 0;
    const compositeKey = makeCompositeKey(row.campaign_address, row.user_address, toWeiString(amountValue));
    const candidates = groupedEvents.get(compositeKey);
    const matched = candidates?.shift();

    return {
      ...row,
      created_at: matched?.created_at ?? row.created_at ?? null,
      tx_hash: row.tx_hash ?? matched?.tx_hash ?? null,
    };
  });
}

export async function fetchCampaignCreatedAtMap(publicClient: PublicClient, campaignAddresses: string[]) {
  if (campaignAddresses.length === 0) {
    return new Map<string, string | null>();
  }

  const addressSet = new Set(campaignAddresses.map((address) => address.toLowerCase()));
  const logs = await publicClient.getLogs({
    address: CAMPAIGN_FACTORY_ADDRESS,
    event: FACTORY_EVENTS[0],
    fromBlock: 0n,
    toBlock: 'latest',
  });

  const matchingLogs = logs.filter((log) => {
    const campaignAddress = log.args.campaignAddress?.toLowerCase();
    return campaignAddress ? addressSet.has(campaignAddress) : false;
  });

  const blockTimestampMap = await getBlockTimestampMap(
    publicClient,
    matchingLogs.map((log) => log.blockNumber),
  );

  const createdAtMap = new Map<string, string | null>();

  for (const log of matchingLogs) {
    const campaignAddress = log.args.campaignAddress?.toLowerCase();
    if (!campaignAddress) {
      continue;
    }

    createdAtMap.set(campaignAddress, blockTimestampMap.get(log.blockNumber.toString()) ?? null);
  }

  return createdAtMap;
}

export function formatWeiToEthString(value: bigint) {
  return formatEther(value);
}
