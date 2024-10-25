import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { joinSquadInvitation, SquadInvitationProps } from '../graphql/squads';
import { useLogContext } from '../contexts/LogContext';
import { Squad } from '../graphql/sources';
import { LogEvent } from '../lib/log';
import { generateQueryKey, RequestKey } from '../lib/query';
import { ActionType } from '../graphql/actions';
import { useActions } from './useActions';
import { persistedQueryClient } from '../lib/persistedQuery';

type UseJoinSquadProps = {
  squad: Pick<Squad, 'id' | 'handle'>;
  referralToken?: string;
};

type UseJoinSquad = () => Promise<Squad>;

export const useJoinSquad = ({
  squad,
  referralToken,
}: UseJoinSquadProps): UseJoinSquad => {
  const queryClient = useQueryClient();
  const { logEvent } = useLogContext();
  const { completeAction } = useActions();
  const { mutateAsync } = useMutation([squad.id], joinSquadInvitation, {
    onSuccess: () => {
      persistedQueryClient.invalidateQueries([RequestKey.Squads]);
    },
  });

  const joinSquad = useCallback(async () => {
    const payload: SquadInvitationProps = {
      sourceId: squad.id,
    };

    if (referralToken) {
      payload.token = referralToken;
    }

    const result = await mutateAsync(payload);

    logEvent({
      event_name: LogEvent.CompleteJoiningSquad,
      extra: JSON.stringify({
        inviter: result.currentMember.user.id,
        squad: result.id,
      }),
    });

    const queryKey = generateQueryKey(
      RequestKey.Squad,
      result.currentMember.user,
      result.handle,
    );
    queryClient.setQueryData(queryKey, result);
    queryClient.invalidateQueries(['squadMembersInitial', squad.handle]);
    completeAction(ActionType.JoinSquad);

    return result;
  }, [
    squad.id,
    squad.handle,
    referralToken,
    logEvent,
    completeAction,
    queryClient,
  ]);

  return joinSquad;
};
