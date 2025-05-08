
export const channels = {
    chat: null,
    event: null,
} as ChannelType;

export type ChannelType = {
    chat: BroadcastChannel | null;
    event: BroadcastChannel | null;
};