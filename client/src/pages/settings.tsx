import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Settings } from "lucide-react";
import { Link } from "wouter";
import { useHousehold } from "@/contexts/household-context";
import LocationSettings from "@/components/settings/location-settings";
import OpenAiApiSettings from "@/components/settings/openai-api-settings";
import WeatherApiSettings from "@/components/settings/weather-api-settings";

export default function SettingsPage() {
  const { refreshHouseholdData } = useHousehold();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-teal-primary" />
              Settings
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">API Settings</h2>
            <OpenAiApiSettings />
            <WeatherApiSettings />
          </div>
          
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">User Settings</h2>
            <LocationSettings />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}