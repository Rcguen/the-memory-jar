"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createListeningRoom,
  endListeningRoom,
  getActiveListeningRoom,
  getListeningRoomParticipants,
  joinListeningRoom,
  leaveListeningRoom,
} from "@/services/listening-room";
import type {
  ListeningRoom,
  ListeningRoomParticipant,
  ListeningRoomTrackSnapshot,
} from "@/types/music";

const EMPTY_PARTICIPANTS: ListeningRoomParticipant[] = [];

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
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const room = roomQuery.data ?? null;
  const participantsQuery = useQuery({
    queryKey: listeningRoomKeys.participants(room?.id),
    queryFn: () => getListeningRoomParticipants(room!.id),
    enabled: enabled && Boolean(room?.id),
    staleTime: 0,
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
    mutationFn: (snapshot: ListeningRoomTrackSnapshot) =>
      createListeningRoom(relationshipId ?? "", snapshot),
    onSuccess: async (createdRoom) => {
      queryClient.setQueryData<ListeningRoom>(
        listeningRoomKeys.active(relationshipId),
        createdRoom,
      );
      await invalidateParticipants(createdRoom.id);
    },
    onError: async () => {
      await queryClient.invalidateQueries({ queryKey: listeningRoomKeys.active(relationshipId) });
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

  const actionError = joinMutation.error
    ?? leaveMutation.error
    ?? endMutation.error
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
    isCreating: createMutation.isPending,
    isJoining: joinMutation.isPending,
    isLeaving: leaveMutation.isPending,
    isEnding: endMutation.isPending,
    createError: createMutation.error,
    actionError,
  };
}
