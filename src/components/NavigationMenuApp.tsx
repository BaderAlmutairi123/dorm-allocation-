'use client'

import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { useEffect, useState } from "react";
import { getAuthState } from "@/lib/auth";

export default function NavigationMenuApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authState = getAuthState();
    setIsAuthenticated(authState.isAuthenticated);
  }, []);

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Dorm Application</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-4 md:w-[400px]">
              <li>
                <NavigationMenuLink asChild>
                  <Link href="/sign-in" className="block rounded-md p-2 hover:bg-accent">
                    <div className="font-medium">Student Sign In</div>
                    <p className="text-sm text-muted-foreground">
                      Access your account to view and manage your application.
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink asChild>
                  <Link href="/application" className="block rounded-md p-2 hover:bg-accent">
                    <div className="font-medium">Dorm Application Process</div>
                    <p className="text-sm text-muted-foreground">
                      Step-by-step guide to submitting your dorm application.
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink asChild>
                  <Link href="/blocks" className="block rounded-md p-2 hover:bg-accent">
                    <div className="font-medium">Student Block</div>
                    <p className="text-sm text-muted-foreground">
                      Choose preferred buildings/floors and block options.
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink asChild>
                  <Link href="/roommates" className="block rounded-md p-2 hover:bg-accent">
                    <div className="font-medium">Potential Roommates</div>
                    <p className="text-sm text-muted-foreground">
                      Find and match with compatible roommates.
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}