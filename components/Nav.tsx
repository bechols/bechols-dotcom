import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Link } from "@tanstack/react-router";

import { SiGithub } from "react-icons/si";
import { SiGmail } from "react-icons/si";
import { SiLinkedin } from "react-icons/si";

export default function Nav() {
  return (
    <div className="flex justify-center pt-4">
      <NavigationMenu>
        <NavigationMenuList className="flex-wrap justify-center gap-y-2">
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link
                to="/"
                className={navigationMenuTriggerStyle()}
                aria-label="Home"
              >
                Home
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link
                to="/about"
                className={navigationMenuTriggerStyle()}
                aria-label="About"
              >
                About
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link
                to="/books"
                className={navigationMenuTriggerStyle()}
                aria-label="Books"
              >
                Books
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link
                to="/interesting"
                className={navigationMenuTriggerStyle()}
                aria-label="Interesting"
              >
                Interesting
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>

          {/* Social icons grouped together to wrap as one unit */}
          <div className="flex shrink-0">
            <NavigationMenuItem>
              <NavigationMenuLink
                className={navigationMenuTriggerStyle()}
                href="mailto:benjamin.echols@gmail.com"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Email"
              >
                <SiGmail />
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={navigationMenuTriggerStyle()}
                href="https://linkedin.com/in/benechols"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="LinkedIn"
              >
                <SiLinkedin />
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={navigationMenuTriggerStyle()}
                href="https://github.com/bechols"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="GitHub"
              >
                <SiGithub />
              </NavigationMenuLink>
            </NavigationMenuItem>
          </div>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
