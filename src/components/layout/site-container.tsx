import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SiteContainerProps<T extends ElementType = "div"> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function SiteContainer<T extends ElementType = "div">({
  as,
  children,
  className,
  ...props
}: SiteContainerProps<T>) {
  const Component = as ?? "div";

  return (
    <Component
      className={cn("mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-10", className)}
      {...props}
    >
      {children}
    </Component>
  );
}
