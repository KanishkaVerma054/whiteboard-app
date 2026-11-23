"use client";
import { useState } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { HTTP_BACKEND } from "@/config";
import { safeCallbackUrl, setToken } from "@/lib/auth";

export const AuthPage = ({ isSignin }: { isSignin: boolean }) => {
  const router = useRouter();
  // where to go after sign-in, e.g. the room that sent us here (like CollabyDraw's signin-form.tsx:27)
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    try {
      if (isSignin) {
        const res = await axios.post(`${HTTP_BACKEND}/signin`, { username, password });
        // /signin answers 200 with { message } (no token) when the inputs fail validation
        if (!res.data.token) {
          setError(res.data.message ?? "Sign in failed");
          return;
        }
        setToken(res.data.token);
        router.push(callbackUrl);
      } else {
        const res = await axios.post(`${HTTP_BACKEND}/signup`, { username, password, name });
        if (!res.data.userId) {
          setError(res.data.message ?? "Sign up failed");
          return;
        }
        // keep the room through signup → signin
        router.push(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
    } catch (e) {
      // 403 (wrong password / no user) and 411 (user exists) land here
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.message ?? "Request failed");
      } else {
        setError("Request failed");
      }
    }
  };

  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <div className="p-6 m-2 bg-white rounded">
        {!isSignin && (
          <div className="p-2">
            <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className="p-2">
          <input type="text" placeholder="Email" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="p-2">
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div className="p-2 text-red-600">{error}</div>}
        <div className="pt-2">
          <button className="bg-red-200 rounded p-2" onClick={handleSubmit}>
            {isSignin ? "Sign in" : "Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};