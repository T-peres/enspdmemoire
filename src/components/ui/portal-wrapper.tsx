import * as React from "react";

interface PortalWrapperProps {
  children: React.ReactNode;
  PortalComponent: React.ComponentType<{ children: React.ReactNode; container?: HTMLElement | null }>;
}

/**
 * Wrapper pour les Portals Radix UI qui gère correctement le cycle de vie
 * et évite les erreurs "removeChild" lors du démontage
 */
export function PortalWrapper({ children, PortalComponent }: PortalWrapperProps) {
  const [mounted, setMounted] = React.useState(false);
  const containerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    // S'assurer que le container existe avant de monter le portal
    containerRef.current = document.body;
    setMounted(true);

    return () => {
      setMounted(false);
      containerRef.current = null;
    };
  }, []);

  // Ne rien rendre tant que le composant n'est pas monté côté client
  if (!mounted || !containerRef.current) {
    return null;
  }

  return <PortalComponent container={containerRef.current}>{children}</PortalComponent>;
}
