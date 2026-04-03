import React from "react";
import { LoadingOverlay } from "@/components/StatusMessages";

const VacationPage = () => {
  const [loading, setLoading] = React.useState(true);

  return (
    <div className="flex flex-col h-[calc(100vh-64px-44px)] sm:h-[calc(100vh-64px-60px)] w-full overflow-hidden bg-background">
      {loading && <LoadingOverlay />}
      <iframe
        src="https://avrahamlip.github.io/vacation-planner/"
        className="w-full h-full border-none shadow-inner"
        title="תוכנית חופשים"
        onLoad={() => setLoading(false)}
        allow="fullscreen"
      />
    </div>
  );
};

export default VacationPage;
