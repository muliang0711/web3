import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { enrichRefundRowsWithChainTimestamps } from '../lib/chainActivity';
import { supabase } from '../lib/supabase';

function getRefundUserAddress(refund: any) {
  return refund.user_address || refund.wallet_address || refund.recipient_address || refund.userAddress || null;
}

export function useRefundHistory(address?: string) {
  const publicClient = usePublicClient();
  const query = useQuery({
    queryKey: ['refundHistory', address],
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

      const campaignAddresses = Array.from(
        new Set(
          refunds
            .map((refund: any) => refund.campaign_address || refund.campaign)
            .filter(Boolean)
        )
      );

      if (campaignAddresses.length === 0) {
        return [];
      }

      const { data: campaigns, error: campaignError } = await supabase
        .from('campaigns')
        .select('address, title')
        .in('address', campaignAddresses);

      if (campaignError) {
        throw campaignError;
      }

      const titleByAddress = new Map((campaigns ?? []).map((campaign: any) => [campaign.address, campaign.title]));

      const refundsWithTitles = refunds.map((refund: any) => {
        const campaignAddress = refund.campaign_address || refund.campaign;
        const amount = Number(refund.amount_eth ?? refund.amount ?? 0);

        return {
          ...refund,
          campaign_title: titleByAddress.get(campaignAddress) || 'Campaign refund',
          campaign_address: campaignAddress,
          points: amount,
        };
      });

      if (!publicClient) {
        return refundsWithTitles;
      }

      try {
        return await enrichRefundRowsWithChainTimestamps(publicClient, refundsWithTitles);
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
