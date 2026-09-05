import { LibraryBig, Lightbulb, Rocket } from "lucide-react";
import { AspectRatio } from "./ui/aspect-ratio";
import { buttonVariants } from "./ui/button";
import { Link } from "@tanstack/react-router";

export default function Hero() {
  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-screen-xl mx-auto">
      <div className="flex flex-col gap-8 w-full lg:w-[45%]">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Ben Echols</h1>
          <span className="text-xl">
            Trying to leave it better than I found it.
          </span>
        </div>
        <div className="flex flex-col gap-4">
          <Link
            to="/about"
            className={buttonVariants({
              variant: "outline",
              className: "w-full min-h-[3.5rem] px-6",
            })}
          >
            <span className="flex justify-between items-center w-full gap-4">
              <span className="text-left">
                Experience and how I like to work
              </span>
              <Lightbulb aria-hidden="true" className="h-6 w-6 flex-shrink-0" />
            </span>
          </Link>
          <Link
            to="/books"
            className={buttonVariants({
              variant: "outline",
              className: "w-full min-h-[3.5rem] px-6",
            })}
          >
            <span className="flex justify-between items-center w-full gap-4">
              <span className="text-left">What I&apos;m reading lately</span>
              <LibraryBig
                aria-hidden="true"
                className="h-6 w-6 flex-shrink-0"
              />
            </span>
          </Link>
          <Link
            to="/interesting"
            className={buttonVariants({
              variant: "outline",
              className: "w-full min-h-[3.5rem] px-6",
            })}
          >
            <span className="flex justify-between items-center w-full gap-4">
              <span className="text-left">Some interesting stuff</span>
              <Rocket aria-hidden="true" className="h-6 w-6 flex-shrink-0" />
            </span>
          </Link>
        </div>
      </div>
      <div className="w-full lg:w-[55%] xl:max-w-2xl">
        <AspectRatio
          ratio={1.47}
          className="overflow-hidden bg-muted rounded-lg"
        >
          <img
            src={"/ben_and_liz_point_lobos.webp"}
            alt="Ben with his favorite person."
            className="h-full w-full object-cover"
            loading="eager"
          />
        </AspectRatio>
      </div>
    </div>
  );
}
