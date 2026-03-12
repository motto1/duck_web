import Image from "next/image";

export function BrandMark({
  className = "h-9 w-9",
}: {
  className?: string;
}) {
  return (
    <Image
      alt="duck_web"
      className={className}
      height={36}
      priority
      src="/brand-icon.png"
      width={36}
    />
  );
}
