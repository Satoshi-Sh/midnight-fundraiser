// This file is part of midnightntwrk/example-counter.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useCallback, useEffect, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import {
  Backdrop,
  CircularProgress,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  IconButton,
  Skeleton,
  Typography,
  TextField,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import WriteIcon from '@mui/icons-material/EditNoteOutlined';
import SendTimeExtensionIcon from '@mui/icons-material/SendTimeExtensionOutlined';
import CopyIcon from '@mui/icons-material/ContentPasteOutlined';
import StopIcon from '@mui/icons-material/HighlightOffOutlined';
import { type BBoardDerivedState, type DeployedBBoardAPI } from '../../../api/src/index';
import { useDeployedBoardContext } from '../hooks';
import { type BoardDeployment } from '../contexts';
import { type Observable } from 'rxjs';
import { State } from '../../../contract/src/index';
import { EmptyCardContent } from './Board.EmptyCardContent';
import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { NetworkId } from '@midnight-ntwrk/zswap';

/** The props required by the {@link Board} component. */
export interface BoardProps {
  /** The observable bulletin board deployment. */
  boardDeployment$?: Observable<BoardDeployment>;
}

/**
 * Provides the UI for a deployed bulletin board contract; allowing messages to be posted or removed
 * following the rules enforced by the underlying Compact contract.
 *
 * @remarks
 * With no `boardDeployment$` observable, the component will render a UI that allows the user to create
 * or join bulletin boards. It requires a `<DeployedBoardProvider />` to be in scope in order to manage
 * these additional boards. It does this by invoking the `resolve(...)` method on the currently in-
 * scope `DeployedBoardContext`.
 *
 * When a `boardDeployment$` observable is received, the component begins by rendering a skeletal view of
 * itself, along with a loading background. It does this until the board deployment receives a
 * `DeployedBBoardAPI` instance, upon which it will then subscribe to its `state$` observable in order
 * to start receiving the changes in the bulletin board state (i.e., when a user posts a new message).
 */
export const Board: React.FC<Readonly<BoardProps>> = ({ boardDeployment$ }) => {
  const boardApiProvider = useDeployedBoardContext();
  const [boardDeployment, setBoardDeployment] = useState<BoardDeployment>();
  const [deployedBoardAPI, setDeployedBoardAPI] = useState<DeployedBBoardAPI>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [boardState, setBoardState] = useState<BBoardDerivedState>();
  const [messagePrompt, setMessagePrompt] = useState<string>();
  const [titlePrompt, setTitlePrompt] = useState<string>();
  const [goalPrompt, setGoalPrompt] = useState<string>();
  const [isWorking, setIsWorking] = useState(!!boardDeployment$);

  // Two simple callbacks that call `resolve(...)` to either deploy or join a bulletin board
  // contract. Since the `DeployedBoardContext` will create a new board and update the UI, we
  // don't have to do anything further once we've called `resolve`.
  const onCreateBoard = useCallback(() => boardApiProvider.resolve(), [boardApiProvider]);
  const onJoinBoard = useCallback(
    (contractAddress: ContractAddress) => boardApiProvider.resolve(contractAddress),
    [boardApiProvider],
  );

  // Callback to handle the posting of a message. The message text is captured in the `messagePrompt`
  // state, and we just need to forward it to the `post` method of the `DeployedBBoardAPI` instance
  // that we received in the `deployedBoardAPI` state.
  const onPostMessage = useCallback(async () => {
    if (!titlePrompt || !messagePrompt || !goalPrompt) {
      setErrorMessage('Please fill in all fields (title, goal, and message)');
      return;
    }

    const goalInput = goalPrompt?.trim();
    if (!goalInput || !/^\d+$/.test(goalInput)) {
      setErrorMessage('Please enter a valid positive integer for the funding goal');
      return;
    }
    try {
      if (deployedBoardAPI) {
        const walletState = await boardApiProvider.getWalletAddress();
        const walletAddress = walletState.address;

        console.log('get wallet address', walletState, walletAddress);

        setIsWorking(true);
        await deployedBoardAPI.post(titlePrompt, messagePrompt, BigInt(goalInput), walletAddress);
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI, setErrorMessage, setIsWorking, messagePrompt]);

  const onSendToken = useCallback(async () => {
    try {
      if (deployedBoardAPI) {
        const wallet = await WalletBuilder.build(
          'https://indexer.testnet-02.midnight.network/api/v1/graphql',
          'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws',
          'http://localhost:6300',
          'https://rpc.testnet-02.midnight.network',
          '0000000000000000000000000000000000000000000000000000000000000000',
          NetworkId.TestNet,
        );

        wallet.start();

        await deployedBoardAPI.contributeWithWallet(wallet, BigInt(1));
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI, setErrorMessage, setIsWorking, messagePrompt]);

  // Callback to handle the taking down of a message. Again, we simply invoke the `takeDown` method
  // of the `DeployedBBoardAPI` instance.
  const onDeleteMessage = useCallback(async () => {
    try {
      if (deployedBoardAPI) {
        setIsWorking(true);
        await deployedBoardAPI.takeDown();
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI, setErrorMessage, setIsWorking]);

  const onCopyContractAddress = useCallback(async () => {
    if (deployedBoardAPI) {
      await navigator.clipboard.writeText(deployedBoardAPI.deployedContractAddress);
    }
  }, [deployedBoardAPI]);

  // Subscribes to the `boardDeployment$` observable so that we can receive updates on the deployment.
  useEffect(() => {
    if (!boardDeployment$) {
      return;
    }

    const subscription = boardDeployment$.subscribe(setBoardDeployment);

    return () => {
      subscription.unsubscribe();
    };
  }, [boardDeployment$]);

  // Subscribes to the `state$` observable on a `DeployedBBoardAPI` if we receive one, allowing the
  // component to receive updates to the change in contract state; otherwise we update the UI to
  // reflect the error was received instead.
  useEffect(() => {
    if (!boardDeployment) {
      return;
    }
    if (boardDeployment.status === 'in-progress') {
      return;
    }

    setIsWorking(false);

    if (boardDeployment.status === 'failed') {
      setErrorMessage(
        boardDeployment.error.message.length ? boardDeployment.error.message : 'Encountered an unexpected error.',
      );
      return;
    }

    // We need the board API as well as subscribing to its `state$` observable, so that we can invoke
    // the `post` and `takeDown` methods later.
    setDeployedBoardAPI(boardDeployment.api);
    const subscription = boardDeployment.api.state$.subscribe(setBoardState);
    return () => {
      subscription.unsubscribe();
    };
  }, [boardDeployment, setIsWorking, setErrorMessage, setDeployedBoardAPI]);

  return (
    <Card sx={{ position: 'relative', width: 400, minWidth: 400, p: 2 }} color="primary">
      {!boardDeployment$ && (
        <EmptyCardContent onCreateBoardCallback={onCreateBoard} onJoinBoardCallback={onJoinBoard} />
      )}

      {boardDeployment$ && (
        <React.Fragment>
          <Backdrop
            sx={{ position: 'absolute', color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            open={isWorking}
          >
            <CircularProgress data-testid="board-working-indicator" />
          </Backdrop>
          <Backdrop
            sx={{ position: 'absolute', color: '#ff0000', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            open={!!errorMessage}
          >
            <StopIcon fontSize="large" />
            <Typography component="div" data-testid="board-error-message">
              {errorMessage}
            </Typography>
          </Backdrop>
          <CardHeader
            avatar={
              boardState ? (
                boardState.state === State.VACANT || (boardState.state === State.OCCUPIED && boardState.isOwner) ? (
                  <LockOpenIcon data-testid="post-unlocked-icon" />
                ) : (
                  <LockIcon data-testid="post-locked-icon" />
                )
              ) : (
                <Skeleton variant="circular" width={20} height={20} />
              )
            }
            titleTypographyProps={{ color: 'primary' }}
            title={toShortFormatContractAddress(deployedBoardAPI?.deployedContractAddress) ?? 'Loading...'}
            action={
              deployedBoardAPI?.deployedContractAddress ? (
                <IconButton title="Copy contract address" onClick={onCopyContractAddress}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              ) : (
                <Skeleton variant="circular" width={20} height={20} />
              )
            }
          />
          <CardContent>
            {boardState ? (
              boardState.state === State.OCCUPIED ? (
                <>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    Campaign Title
                  </Typography>
                  <Typography data-testid="board-campaign-title" variant="subtitle1" fontWeight="bold" color="primary">
                    {boardState.title}
                  </Typography>

                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }} color="textSecondary">
                    Funding Goal
                  </Typography>
                  <Typography data-testid="board-campaign-goal" variant="body2" color="primary">
                    {boardState.goal}
                  </Typography>

                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }} color="textSecondary">
                    Campaign Message
                  </Typography>
                  <Typography data-testid="board-posted-message" minHeight={160} color="primary">
                    {boardState.message}
                  </Typography>
                </>
              ) : (
                <>
                  <TextField
                    id="title-prompt"
                    label="Campaign Title"
                    placeholder="Enter campaign title"
                    variant="outlined"
                    fullWidth
                    size="small"
                    sx={{ mb: 1 }}
                    value={titlePrompt ?? ''}
                    onChange={(e) => setTitlePrompt(e.target.value)}
                  />
                  <TextField
                    id="goal-prompt"
                    placeholder="Enter funding goal amount"
                    label="Funding Goal"
                    type="number"
                    variant="outlined"
                    fullWidth
                    size="small"
                    sx={{ mb: 1 }}
                    value={goalPrompt ?? ''}
                    onChange={(e) => setGoalPrompt(e.target.value)}
                  />
                  <TextField
                    id="message-prompt"
                    label="Campaign Message"
                    placeholder="Enter campain message"
                    variant="outlined"
                    fullWidth
                    multiline
                    minRows={4}
                    maxRows={6}
                    size="small"
                    value={messagePrompt ?? ''}
                    onChange={(e) => setMessagePrompt(e.target.value)}
                  />
                </>
              )
            ) : (
              <Skeleton variant="rectangular" width={245} height={160} />
            )}
          </CardContent>
          <CardActions>
            {deployedBoardAPI ? (
              <React.Fragment>
                <IconButton
                  title="Send tokens to the campaign"
                  data-testid="board-send-tokens-btn"
                  disabled={boardState?.state === State.OCCUPIED || !goalPrompt?.length}
                  onClick={onSendToken}
                >
                  <SendTimeExtensionIcon />
                </IconButton>
                <IconButton
                  title="Post message"
                  data-testid="board-post-message-btn"
                  disabled={boardState?.state === State.OCCUPIED || !messagePrompt?.length}
                  onClick={onPostMessage}
                >
                  <WriteIcon />
                </IconButton>
                <IconButton
                  title="Take down message"
                  data-testid="board-take-down-message-btn"
                  disabled={
                    boardState?.state === State.VACANT || (boardState?.state === State.OCCUPIED && !boardState.isOwner)
                  }
                  onClick={onDeleteMessage}
                >
                  <DeleteIcon />
                </IconButton>
              </React.Fragment>
            ) : (
              <Skeleton variant="rectangular" width={80} height={20} />
            )}
          </CardActions>
        </React.Fragment>
      )}
    </Card>
  );
};

/** @internal */
const toShortFormatContractAddress = (contractAddress: ContractAddress | undefined): React.ReactElement | undefined =>
  // Returns a new string made up of the first, and last, 8 characters of a given contract address.
  contractAddress ? (
    <span data-testid="board-address">
      0x{contractAddress?.replace(/^[A-Fa-f0-9]{6}([A-Fa-f0-9]{8}).*([A-Fa-f0-9]{8})$/g, '$1...$2')}
    </span>
  ) : undefined;
