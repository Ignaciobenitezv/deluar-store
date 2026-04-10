import Image from "next/image";
import bannerDeco from "@/../public/bannerdeco.png";

export function HomeCampaignBanner() {
  return (
    <section className="overflow-hidden rounded-[0.3rem] bg-transparent">
      <div className="relative aspect-[16/3.8] min-h-[8rem] w-full sm:min-h-[9.5rem] lg:min-h-[11.5rem] xl:min-h-[12.5rem]">
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
