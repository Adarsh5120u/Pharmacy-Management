import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";

type UserProfile = {
  name: string;
  email: string;
  role: string;
};

interface LoginProps {
  onAuthenticated: (user: UserProfile) => void;
}

const DEMO_USER = {
  email: "admin@pharmacy.com",
  password: "admin123",
  name: "Johnson",
  role: "Pharmacist",
};

const DEMO_CODE = "123456";

export function Login({ onAuthenticated }: LoginProps) {
  const [step, setStep] = useState<"credentials" | "verify">("credentials");
  const [email, setEmail] = useState(DEMO_USER.email);
  const [password, setPassword] = useState(DEMO_USER.password);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleCredentials = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== DEMO_USER.email || password !== DEMO_USER.password) {
      setError("Invalid email or password.");
      return;
    }

    setStep("verify");
  };

  const handleVerify = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (code !== DEMO_CODE) {
      setError("Verification code is incorrect.");
      return;
    }

    onAuthenticated({
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      role: DEMO_USER.role,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle>Pharmacy Management</CardTitle>
          <CardDescription>
            {step === "credentials"
              ? "Sign in to access the dashboard."
              : "Enter the verification code to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "credentials" ? (
            <form className="space-y-4" onSubmit={handleCredentials}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@pharmacy.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="password">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full">
                Sign In
              </Button>
              <p className="text-xs text-gray-500">
                Demo credentials: {DEMO_USER.email} / {DEMO_USER.password}
              </p>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleVerify}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="otp">
                  Verification Code
                </label>
                <InputOTP
                  id="otp"
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  containerClassName="justify-between"
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <InputOTPSlot key={`slot-${index}`} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full">
                Verify & Continue
              </Button>
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline"
                onClick={() => {
                  setStep("credentials");
                  setCode("");
                  setError("");
                }}
              >
                Back to login
              </button>
              <p className="text-xs text-gray-500">Demo code: {DEMO_CODE}</p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
