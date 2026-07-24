export default function PagesLoading() {
  return <div className="grid animate-pulse gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div className="h-64 rounded-2xl bg-[#edf3ed]" key={index} />)}</div>;
}
