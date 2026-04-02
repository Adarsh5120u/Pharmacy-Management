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

const DEMO_USERS = [
  {
    email: "pharmacist@pharmacy.com",
    password: "admin123",
    name: "Johnson",
    role: "Pharmacist",
  },
  {
    email: "admin@pharmacy.com",
    password: "admin123",
    name: "System Admin",
    role: "Admin",
  },
] as const;

const DEMO_CODE = "123456";

export function Login({ onAuthenticated }: LoginProps) {
  const [step, setStep] = useState<"credentials" | "verify">("credentials");
  const [email, setEmail] = useState(DEMO_USERS[0].email);
  const [password, setPassword] = useState(DEMO_USERS[0].password);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pendingUser, setPendingUser] = useState<UserProfile | null>(null);

  const handleCredentials = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    const matchedUser = DEMO_USERS.find(
      (user) => user.email === normalizedEmail && user.password === password
    );

    if (!matchedUser) {
      setError("Invalid email or password.");
      return;
    }

    setPendingUser({
      name: matchedUser.name,
      email: matchedUser.email,
      role: matchedUser.role,
    });
    setStep("verify");
  };

  const handleVerify = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (code !== DEMO_CODE) {
      setError("Verification code is incorrect.");
      return;
    }

    if (!pendingUser) {
      setError("Session expired. Please sign in again.");
      setStep("credentials");
      return;
    }

    onAuthenticated(pendingUser);
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
              <div className="text-xs text-gray-500 space-y-1">
                <p>Demo pharmacist: {DEMO_USERS[0].email} / {DEMO_USERS[0].password}</p>
                <p>Demo admin: {DEMO_USERS[1].email} / {DEMO_USERS[1].password}</p>
              </div>
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
                  setPendingUser(null);
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
