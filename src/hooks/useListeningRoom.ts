"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applyListeningRoomCommand,
  createListeningRoom,
  endListeningRoom,
  getActiveListeningRoom,
  getListeningRoomParticipants,
  joinListeningRoom,
  leaveListeningRoom,
  ListeningRoomServiceError,
} from "@/services/listening-room";
import type {
  ListeningRoom,
  ListeningRoomParticipant,
  ListeningRoomPlaybackCommand,
  ListeningRoomTrackSnapshot,
} from "@/types/music";

const EMPTY_PARTICIPANTS: ListeningRoomParticipant[] = [];

const createRoomCounters = {
  mutationInvoked: 0,
  mutationSuccess: 0,
  mutationError: 0,
};

function recordCreateRoomEvent(
  event: "mutationInvoked" | "mutationSuccess" | "mutationError",
): void {
  if (process.env.NODE_ENV !== "development") return;
  createRoomCounters[event] += 1;
  console.debug("[listening-room] create flow", {
    event,
    count: createRoomCounters[event],
  });
}

export const listeningRoomKeys = {
  active: (relationshipId: string | null | undefined) => [
    "listening-room",
    relationshipId ?? "none",
  ] as const,
  participants: (roomId: string | null | undefined) => [
    "listening-room-participants",
    roomId ?? "none",
  ] as const,
};

export function useListeningRoom({
  relationshipId,
  profileId,
  enabled,
}: {
  relationshipId: string | null | undefined;
  profileId: string | null | undefined;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();
  const roomQuery = useQuery({
    queryKey: listeningRoomKeys.active(relationshipId),
    queryFn: () => getActiveListeningRoom(relationshipId!),
    enabled: enabled && Boolean(relationshipId),
    staleTime: 0,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const room = roomQuery.data ?? null;
  const participantsQuery = useQuery({
    queryKey: listeningRoomKeys.participants(room?.id),
    queryFn: () => getListeningRoomParticipants(room!.id),
    enabled: enabled && Boolean(room?.id),
    staleTime: 0,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const participants = participantsQuery.data ?? EMPTY_PARTICIPANTS;
  const currentParticipant = useMemo(
    () => participants.find((participant) => participant.profileId === profileId) ?? null,
    [participants, profileId],
  );

  const invalidateParticipants = async (roomId: string) => {
    await queryClient.invalidateQueries({ queryKey: listeningRoomKeys.participants(roomId) });
  };

  const createMutation = useMutation({
    mutationFn: (snapshot: ListeningRoomTrackSnapshot) => {
      recordCreateRoomEvent("mutationInvoked");
      return createListeningRoom(relationshipId ?? "", snapshot);
    },
    onSuccess: async (createdRoom) => {
      recordCreateRoomEvent("mutationSuccess");
      queryClient.setQueryData<ListeningRoom>(
        listeningRoomKeys.active(relationshipId),
        createdRoom,
      );
      await invalidateParticipants(createdRoom.id);
    },
    onError: async (error) => {
      recordCreateRoomEvent("mutationError");
      if (
        error instanceof ListeningRoomServiceError
        && error.code === "ROOM_ALREADY_ACTIVE"
      ) {
        await queryClient.refetchQueries({
          queryKey: listeningRoomKeys.active(relationshipId),
          type: "active",
        });
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: listeningRoomKeys.active(relationshipId),
      });
    },
  });

  const joinMutation = useMutation({
    mutationFn: joinListeningRoom,
    onSuccess: async (participant) => {
      queryClient.setQueryData<ListeningRoomParticipant[]>(
        listeningRoomKeys.participants(participant.roomId),
        (current = []) => {
          const remaining = current.filter((item) => item.profileId !== participant.profileId);
          return [...remaining, participant];
        },
      );
      await invalidateParticipants(participant.roomId);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: leaveListeningRoom,
    onSuccess: async (participant, roomId) => {
      if (participant) {
        queryClient.setQueryData<ListeningRoomParticipant[]>(
          listeningRoomKeys.participants(roomId),
          (current = []) => current.map((item) =>
            item.profileId === participant.profileId ? participant : item),
        );
      }
      await invalidateParticipants(roomId);
    },
  });

  const endMutation = useMutation({
    mutationFn: endListeningRoom,
    onSuccess: async (endedRoom) => {
      queryClient.setQueryData<ListeningRoom | null>(
        listeningRoomKeys.active(relationshipId),
        null,
      );
      await invalidateParticipants(endedRoom.id);
    },
  });

  const commandMutation = useMutation({
    mutationFn: ({
      roomId,
      command,
    }: {
      roomId: string;
      command: ListeningRoomPlaybackCommand;
    }) => applyListeningRoomCommand(roomId, command),
    retry: false,
    onSuccess: (canonicalRoom) => {
      queryClient.setQueryData<ListeningRoom>(
        listeningRoomKeys.active(relationshipId),
        canonicalRoom,
      );
    },
    onError: async (error) => {
      if (
        error instanceof ListeningRoomServiceError
        && error.code === "REVISION_CONFLICT"
      ) {
        await queryClient.refetchQueries({
          queryKey: listeningRoomKeys.active(relationshipId),
          type: "active",
        });
      }
    },
  });

  const actionError = joinMutation.error
    ?? leaveMutation.error
    ?? endMutation.error
    ?? commandMutation.error
    ?? null;

  return {
    room,
    participants,
    currentParticipant,
    roomQuery,
    participantsQuery,
    createRoom: createMutation.mutateAsync,
    joinRoom: joinMutation.mutateAsync,
    leaveRoom: leaveMutation.mutateAsync,
    endRoom: endMutation.mutateAsync,
    applyCommand: commandMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isJoining: joinMutation.isPending,
    isLeaving: leaveMutation.isPending,
    isEnding: endMutation.isPending,
    isApplyingCommand: commandMutation.isPending,
    createError: createMutation.error,
    commandError: commandMutation.error,
    actionError,
  };
}
