import Image from "next/image";
import bannerDeco from "@/../public/bannerdeco.png";

export function HomeCampaignBanner() {
  return (
    <section className="overflow-hidden rounded-[1.85rem] border border-[#ddd4ca] bg-[#f4ede4]">
      <div className="relative aspect-[16/6] min-h-[13rem] w-full sm:min-h-[15rem] lg:min-h-[19rem] xl:min-h-[22rem]">
        <Image
          src={bannerDeco}
          alt="Campana destacada DELUAR"
          fill
          priority={false}
          sizes="(min-width: 1280px) 1200px, (min-width: 768px) 92vw, 100vw"
          className="object-cover"
        />
      </div>
    </section>
  );
}
