import Image from "next/image";
import bannerDeco from "@/../public/bannerdeco.png";

export function HomeCampaignBanner() {
  return (
    <section className="overflow-hidden rounded-[0.45rem] border border-[#e9e4dc] bg-white">
      <div className="relative aspect-[16/4.35] min-h-[9rem] w-full sm:min-h-[11rem] lg:min-h-[13.5rem] xl:min-h-[15rem]">
        <Image
          src={bannerDeco}
          alt="Campana destacada DELUAR"
          fill
          priority={false}
          sizes="(min-width: 1280px) 1180px, (min-width: 768px) 88vw, 100vw"
          className="object-cover"
        />
      </div>
    </section>
  );
}
