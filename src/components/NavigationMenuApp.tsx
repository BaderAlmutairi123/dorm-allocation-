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
import { usePathname } from "next/navigation";

export default function NavigationMenuApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");
  const pathname = usePathname();

  // Get current page name based on pathname
  const getPageName = () => {
    switch (pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/application':
        return 'Application';
      case '/assignment':
        return 'My Assignment';
      case '/blocks':
        return 'Blocks';
      case '/buildings':
        return 'Buildings';
      case '/compatibility':
        return 'Compatibility';
      case '/admin':
        return 'Admin';
      case '/roommates':
        return 'Roommates';
      default:
        return 'Menu';
    }
  };

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
          <NavigationMenuTrigger>{getPageName()}</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-4 md:w-[500px] grid-cols-2">
              <li>
                <NavigationMenuLink asChild>
                  <Link
                    href="/dashboard"
                    className="block rounded-md p-2 hover:bg-accent"
                    onClick={(e) => handleProtectedClick(e, '/dashboard')}
                  >
                    <div className="font-medium">
                      Dashboard
                      {!isAuthenticated && <span className="text-xs text-red-500 ml-2">🔒</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isAuthenticated
                        ? "View your application status and quick actions"
                        : "Sign in required"}
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink asChild>
                  <Link
                    href="/application"
                    className="block rounded-md p-2 hover:bg-accent"
                    onClick={(e) => handleProtectedClick(e, '/application')}
                  >
                    <div className="font-medium">
                      Application
                      {!isAuthenticated && <span className="text-xs text-red-500 ml-2">🔒</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isAuthenticated
                        ? "Submit or update your dorm application"
                        : "Sign in required"}
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink asChild>
                  <Link
                    href="/assignment"
                    className="block rounded-md p-2 hover:bg-accent"
                    onClick={(e) => handleProtectedClick(e, '/assignment')}
                  >
                    <div className="font-medium">
                      My Assignment
                      {!isAuthenticated && <span className="text-xs text-red-500 ml-2">🔒</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isAuthenticated
                        ? "View your room assignment and roommates"
                        : "Sign in required"}
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
                      Blocks
                      {!isAuthenticated && <span className="text-xs text-red-500 ml-2">🔒</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isAuthenticated
                        ? "Create or join a student block"
                        : "Sign in required"}
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink asChild>
                  <Link
                    href="/buildings"
                    className="block rounded-md p-2 hover:bg-accent"
                  >
                    <div className="font-medium">Buildings</div>
                    <p className="text-sm text-muted-foreground">
                      Explore all dorm buildings and availability
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink asChild>
                  <Link
                    href="/compatibility"
                    className="block rounded-md p-2 hover:bg-accent"
                    onClick={(e) => handleProtectedClick(e, '/compatibility')}
                  >
                    <div className="font-medium">
                      Compatibility
                      {!isAuthenticated && <span className="text-xs text-red-500 ml-2">🔒</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isAuthenticated
                        ? "Check compatibility with potential roommates"
                        : "Sign in required"}
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink asChild>
                  <Link
                    href="/admin"
                    className="block rounded-md p-2 hover:bg-accent"
                    onClick={(e) => handleProtectedClick(e, '/admin')}
                  >
                    <div className="font-medium">
                      Admin
                      {!isAuthenticated && <span className="text-xs text-red-500 ml-2">🔒</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isAuthenticated
                        ? "Admin dashboard for housing staff"
                        : "Sign in required"}
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
