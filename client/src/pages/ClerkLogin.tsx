import { SignIn } from "@clerk/clerk-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";

export default function ClerkLogin() {
  const [, setLocation] = useLocation();
  const { isSignedIn } = useAuth();

  // Redirect to dashboard if already signed in
  useEffect(() => {
    if (isSignedIn) {
      setLocation("/");
    }
  }, [isSignedIn, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">IDICRM</CardTitle>
            <CardDescription>
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignIn
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none border-0",
                },
              }}
              redirectUrl="/"
            />
          </CardContent>
        </Card>

        {/* Customer signup link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            New customer?{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-blue-600"
              onClick={() => setLocation("/signup")}
            >
              Request a quote
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
