import { UseMutateAsyncFunction, useMutation } from '@tanstack/react-query';
import router from 'next/router';
import { useContext } from 'react';
import { SquadForm, createSquad } from '../../graphql/squads';
import { LogEvent } from '../../lib/log';
import { ActionType } from '../../graphql/actions';
import LogContext from '../../contexts/LogContext';
import { useToastNotification } from '../useToastNotification';
import { useActions } from '../useActions';
import { Squad } from '../../graphql/sources';
import { ApiErrorResult } from '../../graphql/common';
import { parseOrDefault } from '../../lib/func';
import { getRandom4Digits } from '../../lib';
import { persistedQueryClient } from '../../lib/persistedQuery';
import { RequestKey } from '../../lib/query';

interface UseSquadCreateProps {
  onSuccess?: (squad: Squad) => void;
  retryWithRandomizedHandle?: boolean;
}

interface UseSquadCreate {
  isLoading: boolean;
  onCreateSquad: UseMutateAsyncFunction<Squad, unknown, SquadForm>;
}

type CustomHook = (props?: UseSquadCreateProps) => UseSquadCreate;

const DEFAULT_ERROR = "Oops! That didn't seem to work. Let's try again!";
const HANDLE_ERROR = 'handle is already used';

export const useSquadCreate: CustomHook = ({
  onSuccess,
  retryWithRandomizedHandle,
} = {}) => {
  const { logEvent } = useContext(LogContext);
  const { displayToast } = useToastNotification();
  const { completeAction } = useActions();

  const { mutateAsync: onCreateSquad, isLoading } = useMutation(createSquad, {
    onSuccess: (squad) => {
      logEvent({
        event_name: LogEvent.CompleteSquadCreation,
      });

      completeAction(ActionType.CreateSquad);

      if (onSuccess) {
        onSuccess(squad);
        persistedQueryClient.invalidateQueries([RequestKey.Squads]);
      } else {
        router.replace(squad.permalink);
      }
    },
    onError: (error: ApiErrorResult, variables) => {
      const result = parseOrDefault<Record<string, string>>(
        error?.response?.errors?.[0]?.message,
      );

      if (
        retryWithRandomizedHandle &&
        typeof result === 'object' &&
        result.handle === HANDLE_ERROR
      ) {
        onCreateSquad({
          ...variables,
          handle: `${variables.handle}${getRandom4Digits()}`,
        });
        return;
      }

      displayToast(typeof result === 'object' ? result.handle : DEFAULT_ERROR);
    },
  });

  return { onCreateSquad, isLoading };
};
