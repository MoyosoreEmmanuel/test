"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";
import { ModeToggle } from "@/components/ui/mode-toggle";
import Navbar from "./Navbar";
import { createRootFolderIfNotExists } from "@/components/ui/createRootFolder";

// Import lineSpinner dynamically
import dynamic from 'next/dynamic';
const LineSpinnerWrapper = dynamic(() => import('./LineSpinnerWrapper'), { ssr: false });

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  let rootFolderCreated = false; // Singleton flag
  const currentPath = usePathname();
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!rootFolderCreated) {
      createRootFolderIfNotExists();
      rootFolderCreated = true; // Set the flag to true after the first execution
    }
    if (isLoaded) {
      if (!userId) {
        router.replace("/sign-in");
      } else {
        setIsLoading(false);
      }
    }
  }, [isLoaded, userId, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen w-screen">
        <LineSpinnerWrapper />
      </div>
    );
  }

  const links = [
    { label: "Home", href: "/dashboard" },
    { label: "My Files", href: "/dashboard/my-files" },
    { label: "AI Services", href: "/dashboard/ai-services" },
    { label: "Pricing", href: "/dashboard/pricing" },
  ];

  const aiServicesLinks = [
    // { label: "GCP", href: "/dashboard/apple-detection" },
    {
      label: "APPLE DETECTION",
      href: "/dashboard/apple-detection-gcp-selected",
    },
    // { label: "ROBO", href: "/dashboard/apple-detection-roboflow" },
    {
      // label: "ROBO SELECT",
      // href: "/dashboard/apple-detection-roboflow-selected",
    },
  ];

  const currentLabel =
    links.find((link) => link.href === currentPath)?.label ||
    aiServicesLinks.find((link) => link.href === currentPath)?.label ||
    "Dashboard";

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-black">
      <Navbar />
      <div className="flex-1 flex flex-col overflow-hidden md:ml-64 p-6">
        <header className="opacity-0 sm:opacity-100 flex justify-between items-center p-4 md:px-6 md:py-2 bg-white dark:bg-black shadow-sm border-b">
          <h3 className="text-xl md:text-xl uppercase text-gray-900 dark:text-gray-100">
            {currentLabel}
          </h3>
          <div className="flex items-center space-x-6">
            <ModeToggle />
            <UserButton />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
