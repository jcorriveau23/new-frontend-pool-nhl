export function getHankoApi(): string {
    // Validate the existance of an environment variables and return an error if it does not exist.
    const value = process.env.NEXT_PUBLIC_HANKO_API_URL;
    if (value === undefined) {
      throw new Error(
        `The NEXT_PUBLIC_HANKO_API_URL environment variable needs to be set.`
      );
    }
    return value;
  }
  