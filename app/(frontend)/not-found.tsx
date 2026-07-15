import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-background">
      <div className="text-center px-margin-mobile max-w-lg">
        <h1 className="text-[120px] md:text-[180px] font-bold text-primary-fixed leading-none">
          404
        </h1>
        <div className="w-16 h-1.5 bg-secondary rounded-full mx-auto my-md" />
        <h2 className="text-headline-xl text-on-surface mb-md">
          Sayfa Bulunamadı
        </h2>
        <p className="text-body-md text-on-surface-variant mb-xl">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir. Lütfen
          adresi kontrol ederek tekrar deneyin.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-secondary text-white px-xl py-lg rounded-lg text-headline-md hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-all shadow-soft"
        >
          <span className="material-symbols-outlined">home</span>
          Anasayfaya Dön
        </Link>
      </div>
    </div>
  );
}
