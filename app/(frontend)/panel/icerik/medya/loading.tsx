export default function MediaLoading() {
  return <div className="grid animate-pulse gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div className="aspect-[4/3] rounded-2xl bg-[#edf3ed]" key={index} />)}</div>;
}
