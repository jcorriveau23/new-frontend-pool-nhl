"use client";

import { Link, useRouter } from "@/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useTranslations } from "next-intl";
import { useUserContext } from "@/context/user-context";
import { LoginResponse } from "@/data/user/response";
import { fbLogin } from "@/lib/facebook-sdk";

export default function RegisterForm() {
  const t = useTranslations();
  const router = useRouter();
  const { connectUser } = useUserContext();

  const formSchema = z.object({
    username: z.string().min(2, {
      message: t("UsernameLenghtValidation"),
    }),
    password: z.string().min(8, {
      message: t("PasswordLengthValidation"),
    }),
    repeatedPassword: z.string().min(8, {
      message: t("PasswordLengthValidation"),
    }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      repeatedPassword: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (values.password != values.repeatedPassword) {
      alert(t("PasswordsNotMatchingError"));
      return;
    }
    const res = await fetch("/api-rust/user/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: values.username,
        password: values.password,
        email: values.username,
        phone: values.username,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      alert(
        t("CouldNotRegisterError", {
          error: error,
        })
      );
      return;
    }

    const userInfo: LoginResponse = await res.json();
    connectUser(userInfo);
    router.push("/"); // Navigate to the home page on success login.
  };

  const continueWithGoogle = () => {
    alert("TODO: Ajout de la connection avec google.");
  };

  const continueWithFacebook = async () => {
    const response = await fbLogin();
    if (response.authResponse === null) {
      alert(t("CouldNotQueryFacebookAuthentificationToken"));
    }

    const res = await fetch("/api-rust/user/social-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response.authResponse),
    });

    if (!res.ok) {
      const error = await res.text();
      alert(
        t("CouldNotContinueWithFacebook", {
          error: error,
        })
      );
      return;
    }

    const userInfo = await res.json();
    connectUser(userInfo);
    router.push("/"); // Navigate to the home page on success login.
  };

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{t("SignUp")}</CardTitle>
        <CardDescription>{t("RegisterInfo")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Username")}</FormLabel>
                  <FormControl>
                    <Input placeholder="username" {...field} />
                  </FormControl>
                  <FormDescription />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Password")}</FormLabel>
                  <FormControl>
                    <Input placeholder="" {...field} type="password" />
                  </FormControl>
                  <FormDescription />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="repeatedPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("RepeatPassword")}</FormLabel>
                  <FormControl>
                    <Input placeholder="" {...field} type="password" />
                  </FormControl>
                  <FormDescription></FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              {t("CreateAnAccount")}
            </Button>
          </form>
        </Form>
        <Separator />
        {/* <Button
          variant="outline"
          className="w-full"
          onClick={() => continueWithGoogle()}
        >
          {t("LoginWithGoogle")}
        </Button> */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => continueWithFacebook()}
        >
          {t("LoginWithFacebook")}
        </Button>
        <div className="mt-4 text-center text-sm">
          {t("AlreadyHaveAccount")}{" "}
          <Link href="/login" className="text-link hover:underline">
            {t("SignIn")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
