export default function Loader() {
  return (
    <div className="flex items-center justify-center p-16">
      <div
        className="w-6 h-6 border-2 rounded-full animate-spin"
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          borderTopColor: 'var(--accent)',
        }}
      />
    </div>
  );
}
