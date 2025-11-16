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
import { authClient } from "@/lib/supabase/auth";

export default function NavigationMenuApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authClient.getSession();
        if (session) {
          setIsAuthenticated(true);
          // Get user data to display name
          const user = await authClient.getUser();
          if (user && user.user_metadata) {
            const firstName = user.user_metadata.first_name || "";
            const lastName = user.user_metadata.last_name || "";
            setUserName(`${firstName} ${lastName}`.trim() || user.email || "User");
          }
        } else {
          setIsAuthenticated(false);
          setUserName("");
        }
      } catch {
        setIsAuthenticated(false);
        setUserName("");
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: authListener } = authClient.onAuthStateChange(async (event, session) => {
      if (session) {
        setIsAuthenticated(true);
        const user = await authClient.getUser();
        if (user && user.user_metadata) {
          const firstName = user.user_metadata.first_name || "";
          const lastName = user.user_metadata.last_name || "";
          setUserName(`${firstName} ${lastName}`.trim() || user.email || "User");
        }
      } else {
        setIsAuthenticated(false);
        setUserName("");
      }
    });

    // Cleanup listener on unmount
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleProtectedClick = (e: React.MouseEvent, href: string) => {
    if (!isAuthenticated) {
      e.preventDefault();
      // Redirect to sign-in page instead of showing alert
      window.location.href = '/sign-in';
    }
  };

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Dorm Application</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-4 md:w-[400px]">
              
              <li>
                <NavigationMenuLink asChild>
                  <Link
                    href="/application"
                    className="block rounded-md p-2 hover:bg-accent"
                    onClick={(e) => handleProtectedClick(e, '/application')}
                  >
                    <div className="font-medium">
                      Dorm Application Process
                      {!isAuthenticated && <span className="text-xs text-red-500 ml-2">🔒</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isAuthenticated
                        ? "Step-by-step guide to submitting your dorm application."
                        : "Sign in required - Click to go to sign in page"}
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink asChild>
                  <Link
                    href="/blocks"
                    className="block rounded-md p-2 hover:bg-accent"
                    onClick={(e) => handleProtectedClick(e, '/blocks')}
                  >
                    <div className="font-medium">
                      Student Block
                      {!isAuthenticated && <span className="text-xs text-red-500 ml-2">🔒</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isAuthenticated
                        ? "Choose preferred buildings/floors and block options."
                        : "Sign in required - Click to go to sign in page"}
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink asChild>
                  <Link
                    href="/roommates"
                    className="block rounded-md p-2 hover:bg-accent"
                    onClick={(e) => handleProtectedClick(e, '/roommates')}
                  >
                    <div className="font-medium">
                      Potential Roommates
                      {!isAuthenticated && <span className="text-xs text-red-500 ml-2">🔒</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isAuthenticated
                        ? "Find and match with compatible roommates."
                        : "Sign in required - Click to go to sign in page"}
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