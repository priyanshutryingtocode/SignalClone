import Icon from "@/components/Icon";

export default function ChatEmptyState() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-signal-bg px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-signal-panel text-signal-subtext">
        <Icon name="send" size={25} />
      </div>
      <p className="text-[15px] font-medium text-signal-text">Select a conversation</p>
      <p className="mt-1 text-sm text-signal-subtext">Choose a chat from the sidebar or start a new one.</p>
    </div>
  );
}
