"use server";

export async function getServerSideUsers(userIds: string[] | null) {
  /* 
  Query the list of user infos with a list of user ids. 
  */

  if (userIds === null) {
    return [];
  }

  try {
    const res = await fetch(
      `http://localhost/api-rust/users/${userIds.join(",")}`,
      {
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) {
      return [];
    }

    return await res.json();
  } catch (e: any) {
    return [];
  }
}
