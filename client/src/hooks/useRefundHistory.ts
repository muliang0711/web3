import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { enrichRefundRowsWithChainTimestamps, fetchCampaignCreatedAtMap } from '../lib/chainActivity';
import { supabase } from '../lib/supabase';
import { fetchRegistrationTimestampForAddress } from '../lib/userRegistration';

function getRefundUserAddress(refund: any) {
  return refund.user_address || refund.wallet_address || refund.recipient_address || refund.userAddress || null;
}

export function useRefundHistory(address?: string) {
  const publicClient = usePublicClient();
  const query = useQuery({
    queryKey: ['refundHistory', address, publicClient?.chain?.id],
    enabled: Boolean(address),
    staleTime: 1000 * 30,
    retry: 1,
    queryFn: async () => {
      const normalizedAddress = address!.toLowerCase();
      const { data, error } = await supabase
        .from('refunds')
        .select('*')
        .ilike('user_address', address!)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const refunds = (data ?? []).filter((refund: any) => {
        const refundUserAddress = getRefundUserAddress(refund);
        return refundUserAddress && refundUserAddress.toLowerCase() === normalizedAddress;
      });

      let refundsWithTitles = refunds.map((refund: any) => {
        const campaignAddress = refund.campaign_address || refund.campaign;
        const amount = Number(refund.amount_eth ?? refund.amount ?? 0);

        return {
          ...refund,
          campaign_title: 'Campaign refund',
          campaign_address: campaignAddress,
          points: amount,
        };
      });

      const campaignAddresses = Array.from(
        new Set(
          refundsWithTitles
            .map((refund: any) => refund.campaign_address || refund.campaign)
            .filter(Boolean)
        )
      );

      if (!publicClient) {
        return refundsWithTitles;
      }

      try {
        const [registrationTimestamp, createdAtMap, campaignsResult] = await Promise.all([
          fetchRegistrationTimestampForAddress(publicClient, address!).catch(() => null),
          fetchCampaignCreatedAtMap(publicClient, campaignAddresses).catch(() => new Map<string, string | null>()),
          campaignAddresses.length === 0
            ? Promise.resolve({ data: [], error: null })
            : supabase
                .from('campaigns')
                .select('address, title')
                .in('address', campaignAddresses),
        ]);

        if (campaignsResult.error) {
          throw campaignsResult.error;
        }

        const titleByAddress = new Map((campaignsResult.data ?? []).map((campaign: any) => [campaign.address, campaign.title]));
        const enrichedRefunds = await enrichRefundRowsWithChainTimestamps(publicClient, refundsWithTitles).then((rows) =>
          rows.map((refund: any) => ({
            ...refund,
            campaign_title: titleByAddress.get(refund.campaign_address) || refund.campaign_title || 'Campaign refund',
          })),
        );

        const registrationTime = registrationTimestamp ? new Date(registrationTimestamp).getTime() : null;

        return enrichedRefunds.filter((refund: any) => {
          const campaignAddress = refund.campaign_address?.toLowerCase();
          const campaignCreatedAt = campaignAddress ? createdAtMap.get(campaignAddress) ?? null : null;
          const refundTime = refund.created_at ? new Date(refund.created_at).getTime() : null;
          const campaignCreatedTime = campaignCreatedAt ? new Date(campaignCreatedAt).getTime() : null;

          if (campaignAddress && !campaignCreatedAt) {
            return false;
          }

          if (
            refundTime !== null &&
            campaignCreatedTime !== null &&
            Number.isFinite(refundTime) &&
            Number.isFinite(campaignCreatedTime) &&
            refundTime < campaignCreatedTime
          ) {
            return false;
          }

          if (
            refundTime !== null &&
            registrationTime !== null &&
            Number.isFinite(refundTime) &&
            Number.isFinite(registrationTime) &&
            refundTime < registrationTime
          ) {
            return false;
          }

          return true;
        });
      } catch (timestampError) {
        console.warn('Failed to load on-chain refund timestamps, falling back to database created_at.', timestampError);
        return refundsWithTitles;
      }
    },
  });

  return {
    refunds: query.data ?? [],
    refetchRefunds: query.refetch,
    status: {
      isLoading: query.isPending || query.isFetching,
      error: query.error instanceof Error ? query.error.message : null,
    },
  };
}
