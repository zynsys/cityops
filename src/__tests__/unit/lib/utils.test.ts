import { cn, isPostcode, locationParam } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("rounded", "text-sm", { "font-bold": true })).toBe(
      "rounded text-sm font-bold"
    );
  });

  it("resolves Tailwind conflicts", () => {
    const result = cn("px-2 py-1", "px-4");

    expect(result).toContain("px-4");
    expect(result).toContain("py-1");
    expect(result).not.toContain("px-2");
  });
});

describe("isPostcode", () => {
  it.each(["SW1A 2AA", "AB10 1AA", "EC1A 1BB", "SW1A", "EC1"])(
    "accepts %s",
    (value) => {
      expect(isPostcode(value)).toBe(true);
    }
  );

  it.each(["Bournemouth", "Aberdeen", "123", ""])("rejects %s", (value) => {
    expect(isPostcode(value)).toBe(false);
  });
});

describe("locationParam", () => {
  it("returns an uppercased postcode param for postcode input", () => {
    expect(locationParam("sw1a 2aa")).toEqual({
      key: "postcode",
      value: "SW1A 2AA",
    });
  });

  it("returns a city param for city input", () => {
    expect(locationParam("Manchester")).toEqual({
      key: "city",
      value: "Manchester",
    });
  });
});
