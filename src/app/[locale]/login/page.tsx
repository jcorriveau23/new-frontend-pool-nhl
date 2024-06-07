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
import { fbLogin } from "@/lib/facebook-sdk";

export default function LoginForm() {
  const t = useTranslations();
  const { connectUser } = useUserContext();
  const router = useRouter();

  const formSchema = z.object({
    username: z.string().min(2, {
      message: t("UsernameLenghtValidation"),
    }),
    password: z.string().min(8, {
      message: t("PasswordLengthValidation"),
    }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const res = await fetch("/api-rust/user/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: values.username,
        password: values.password,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      alert(
        t("CouldNotLoginError", {
          error: error,
        })
      );
      return;
    }

    const userInfo = await res.json();
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
        <CardTitle className="text-2xl">{t("Login")}</CardTitle>
        <CardDescription>{t("LoginInfo")}</CardDescription>
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
            <Button type="submit" className="w-full">
              {t("Login")}
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
          {t("NoAccount")}{" "}
          <Link href="/register" className="text-link hover:underline">
            {t("SignUp")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
