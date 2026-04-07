import type { PublicClient } from 'viem';
import { USER_REGISTRY_ADDRESS } from './contracts';

const USER_REGISTRY_EVENTS = [
  {
    type: 'event',
    name: 'UserRegistered',
    inputs: [
      { indexed: true, name: 'userAddress', type: 'address' },
      { indexed: false, name: 'username', type: 'string' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
] as const;

function toIsoString(timestamp?: bigint) {
  if (timestamp === undefined) {
    return null;
  }

  return new Date(Number(timestamp) * 1000).toISOString();
}

export async function fetchRegistrationTimestampForAddress(
  publicClient: PublicClient,
  address: string,
) {
  const logs = await publicClient.getLogs({
    address: USER_REGISTRY_ADDRESS,
    event: USER_REGISTRY_EVENTS[0],
    args: { userAddress: address as `0x${string}` },
    fromBlock: 0n,
    toBlock: 'latest',
  });

  const latestLog = logs[logs.length - 1];
  return toIsoString(latestLog?.args.timestamp);
}

export async function fetchRegistrationTimestampsForAddresses(
  publicClient: PublicClient,
  addresses: string[],
) {
  if (addresses.length === 0) {
    return new Map<string, string | null>();
  }

  const normalizedAddresses = new Set(addresses.map((address) => address.toLowerCase()));
  const logs = await publicClient.getLogs({
    address: USER_REGISTRY_ADDRESS,
    event: USER_REGISTRY_EVENTS[0],
    fromBlock: 0n,
    toBlock: 'latest',
  });

  const timestampByAddress = new Map<string, string | null>();

  for (const log of logs) {
    const userAddress = log.args.userAddress?.toLowerCase();
    if (!userAddress || !normalizedAddresses.has(userAddress)) {
      continue;
    }

    timestampByAddress.set(userAddress, toIsoString(log.args.timestamp));
  }

  return timestampByAddress;
}
