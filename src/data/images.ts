export type SiteImage = { src: string; alt: string; credit: string };

function unsplash(id: string, alt: string, slug: string): SiteImage {
  return {
    src: `https://images.unsplash.com/photo-${id}`,
    alt,
    credit: `https://unsplash.com/photos/${slug}`,
  };
}

export const IMAGES = {
  freight: unsplash(
    "1708596718852-5aa3947ccdf5",
    "Truck trailer loaded with white cargo bags at a loading bay",
    "a-semi-truck-is-loaded-with-white-bags-WZrmEaufAyQ",
  ),
  equipment: unsplash(
    "1768085091650-e8e89ef57b76",
    "Yellow excavator raising its bucket against a clear blue sky",
    "yellow-excavator-digging-dirt-against-a-blue-sky-OyI1n2iR52c",
  ),
  bus: unsplash(
    "1613463918637-3574cd5d34c0",
    "Minibus with luggage on its roof travelling on an open highway through the savanna",
    "white-van-on-road-during-daytime-6SlIB057YQs",
  ),
  onDemand: unsplash(
    "1738507869660-b44ea20ab037",
    "Two cargo trucks driving towards the camera on a long highway",
    "a-couple-of-trucks-that-are-on-a-road-5k68xh2BS3g",
  ),
  lagos: unsplash(
    "1708674282655-3637d492dc74",
    "Aerial view of a Lagos expressway with traffic and a bus",
    "an-aerial-view-of-a-stadium-with-a-bus-on-the-road-W39f1D5hKes",
  ),
  inspection: unsplash(
    "1622645916455-aa13b87438ec",
    "Inspector in a hard hat checking a large haul truck",
    "man-in-brown-jacket-standing-beside-yellow-truck-lHI9NA4U7hg",
  ),
  warehouse: unsplash(
    "1645736315000-6f788915923b",
    "Forklift moving pallets through a warehouse aisle",
    "a-forklift-driving-through-a-warehouse-filled-with-pallets-F2C_mSrb6iM",
  ),
  construction: unsplash(
    "1621355254227-14b1001a91c9",
    "Mobile crane and building materials on a construction site",
    "yellow-and-black-heavy-equipment-near-brown-wooden-post-Dl8rvbAcALM",
  ),
  agriculture: unsplash(
    "1746014929708-fcb859fd3185",
    "Farmers harvesting leafy greens in a field",
    "farmers-harvest-leafy-greens-in-the-field-HzdCcbUDCbo",
  ),
  manufacturing: unsplash(
    "1741591646737-e634ae96e83d",
    "Workers at production tables in a garment factory",
    "workers-are-busy-in-an-industrial-garment-factory-Mv4gduCPx5Q",
  ),
  retail: unsplash(
    "1649502913092-fb7f0e8fc632",
    "Busy commercial street and market buildings on Lagos Island",
    "a-city-street-filled-with-lots-of-traffic-vvQW-3yfuos",
  ),
  vendor: unsplash(
    "1574757974346-45bae947d89a",
    "Site worker in hi-vis talking to a truck driver at the cab window",
    "man-standing-in-front-of-freight-truck-YhoXp0AdEWc",
  ),
} satisfies Record<string, SiteImage>;
