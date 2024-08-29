// The pools page, list all the pools stored in the db.

"use client";
import * as React from "react";
import { PoolState } from "@/data/pool/model";
import InProgressPool from "./in-progress/in-progress-pool";
import CreatedPool from "./created/created-pool";
import DynastyPool from "./dynasty/dynasty-pool";
import DraftPool from "./draft/draft-pool";
import { SocketProvider } from "@/context/socket-context";
import { usePoolContext } from "@/context/pool-context";
import { useTranslations } from "next-intl";
import PageTitle from "@/components/page-title";

export default function PoolStatus() {
  const { poolInfo } = usePoolContext();
  const t = useTranslations();

  // const { jwt } = useSession();
  const jwt =
    "eyJhbGciOiJSUzI1NiIsImtpZCI6ImRhZmE1ODdhLTBhNzktNDFkMi05ZTk5LTQ1MDgxNDQ2M2YyZiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiaG9ja2V5cG9vbC5saXZlIl0sImVtYWlsIjp7ImFkZHJlc3MiOiJqY29ycml2ZWF1MjNAZ21haWwuY29tIiwiaXNfcHJpbWFyeSI6dHJ1ZSwiaXNfdmVyaWZpZWQiOnRydWV9LCJleHAiOjE3MTk3NTUwNzIsImlhdCI6MTcxOTY2ODY3Miwic3ViIjoiY2YxYjQ0ZmQtZTdhMi00NzFlLTg2MDItNGNkZWQxYTU4ZThlIn0.mdJqgAGyW7NG6JWemiK0eKBS8nDX76l8V1WNC5pQUS8kw8bEBkz2SHoKT2FpC4UmOgoGhFMNezu4JAz6eQ1s-gUe5RHSXDsU43Xm5UuBs3675wj-K4PryG7ouuUpGqQWJFjZiZ1g1eILR5Bm4JvPuOTmY0efHamro3e2DNkINh-f_InLCH1nc_2zGAPiklhw54ABdcbfM7F1qXgQxAusfiV_T0zAmhkIn_zKhw0LExsH2zuAediYn5tVbEYKXzxp-QEeaRQvBWBEXWJ6-5LESsZzkgKXS83D0IQ0oWF648h-yjCZbq-9T-FipYJFK-V-oWPAohNV2eds8KId1UPBW6oc4AjP2qHYp3NUmwSMMr86iSrkj4JFHh1XyrKrAjWIWr8SrP2MEbhE6XJg207uKPg2gOgwxq0LIzKpx9l9gPzJONJ43SP391N_zU52EOdNkrzK_la8Ze_uzQ1zZ2d7wHUOZWZ2cKjWf8sxCi-3k-iUxSRZm9nlQnf81QXSvbb4El9z4DbQAtyUyL1IPiq8QXEzJLJSWZRrVyLl2a7zzPZ9rIG-8p6PD6DYue0ByeSr4SP3U1hvnDWlvRfa8OyMfpFqFJ2WyF5VOZE9sXi95S25pKwHhq2BltOyItdQ1bmFx7P8yUODkMUBjIYfNj561KCaog9wN_Lu7dk3eTl9VKw";

  switch (poolInfo.status) {
    case PoolState.Created:
      return (
        <>
          <PageTitle
            title={t("PoolCreatedPageTitle", { poolName: poolInfo.name })}
          />
          <SocketProvider jwt={jwt}>
            <CreatedPool />
          </SocketProvider>
        </>
      );
    case PoolState.Draft:
      return (
        <>
          <PageTitle
            title={t("PoolDraftPageTitle", { poolName: poolInfo.name })}
          />
          <SocketProvider jwt={jwt}>
            <DraftPool />
          </SocketProvider>
        </>
      );
    case PoolState.InProgress:
    case PoolState.Final:
      return (
        <>
          <PageTitle
            title={t("PoolInProgressPageTitle", { poolName: poolInfo.name })}
          />
          <InProgressPool />
        </>
      );
    case PoolState.Dynasty:
      return (
        <>
          <PageTitle title={t("PoolDynastyPageTitle")} />
          <DynastyPool />
        </>
      );
  }
}
