import exifr from "exifr";
import { extractMetadata, describeMetadataFlags } from "../../src/services/metadata";

jest.mock("exifr");
const mockedParse = exifr.parse as jest.MockedFunction<typeof exifr.parse>;

describe("extractMetadata", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("flags NO_EXIF_DATA when exifr resolves an empty object", async () => {
    mockedParse.mockResolvedValue({});

    const result = await extractMetadata(Buffer.from("irrelevant"));

    expect(result.flags).toEqual(["NO_EXIF_DATA"]);
    expect(result.raw).toEqual({});
  });

  it("flags NO_EXIF_DATA when exifr resolves undefined", async () => {
    mockedParse.mockResolvedValue(undefined as never);

    const result = await extractMetadata(Buffer.from("irrelevant"));

    expect(result.flags).toEqual(["NO_EXIF_DATA"]);
    expect(result.raw).toBeNull();
  });

  it("flags NO_EXIF_DATA when exifr throws", async () => {
    mockedParse.mockRejectedValue(new Error("not a supported format"));

    const result = await extractMetadata(Buffer.from("irrelevant"));

    expect(result.flags).toEqual(["NO_EXIF_DATA"]);
    expect(result.raw).toBeNull();
  });

  it("flags NO_GPS_DATA only when device info is present but GPS is missing", async () => {
    mockedParse.mockResolvedValue({ Make: "Apple", Model: "iPhone 15" });

    const result = await extractMetadata(Buffer.from("irrelevant"));

    expect(result.make).toBe("Apple");
    expect(result.cameraModel).toBe("iPhone 15");
    expect(result.flags).toEqual(["NO_GPS_DATA"]);
  });

  it("flags EDITED_WITH_SOFTWARE only when device info and GPS are both present", async () => {
    mockedParse.mockResolvedValue({
      Make: "Apple",
      Model: "iPhone 15",
      Software: "Adobe Photoshop",
      latitude: 51.5,
      longitude: -0.12
    });

    const result = await extractMetadata(Buffer.from("irrelevant"));

    expect(result.software).toBe("Adobe Photoshop");
    expect(result.gpsLatitude).toBe(51.5);
    expect(result.gpsLongitude).toBe(-0.12);
    expect(result.flags).toEqual(["EDITED_WITH_SOFTWARE"]);
  });

  it("flags NO_CAPTURE_DEVICE_INFO and NO_GPS_DATA for structural-only metadata (e.g. a PNG)", async () => {
    mockedParse.mockResolvedValue({ ImageWidth: 1, ImageHeight: 1 });

    const result = await extractMetadata(Buffer.from("irrelevant"));

    expect(result.make).toBeNull();
    expect(result.cameraModel).toBeNull();
    expect(result.flags).toEqual(["NO_CAPTURE_DEVICE_INFO", "NO_GPS_DATA"]);
  });

  it("raises no flags when device, software absence, and GPS are all satisfied", async () => {
    mockedParse.mockResolvedValue({
      Make: "Apple",
      Model: "iPhone 15",
      latitude: 51.5,
      longitude: -0.12
    });

    const result = await extractMetadata(Buffer.from("irrelevant"));

    expect(result.flags).toEqual([]);
  });
});

describe("describeMetadataFlags", () => {
  it("translates known flags into plain-language sentences", () => {
    const [sentence] = describeMetadataFlags(["NO_GPS_DATA"]);
    expect(sentence).toBe("No location data is attached to this file.");
  });

  it("passes an unrecognized flag through unchanged", () => {
    expect(describeMetadataFlags(["SOME_FUTURE_FLAG"])).toEqual(["SOME_FUTURE_FLAG"]);
  });

  it("maps multiple flags in order", () => {
    const sentences = describeMetadataFlags(["NO_CAPTURE_DEVICE_INFO", "NO_GPS_DATA"]);
    expect(sentences).toEqual([
      "The file has some embedded metadata, but no camera or device information.",
      "No location data is attached to this file."
    ]);
  });
});
