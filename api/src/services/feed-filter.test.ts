import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildMoreFeedEntries,
  filterPostsForShop,
  moreFeedEntriesInShopCity,
} from "./feed-filter.js";
import type { PostForFeed, ShopForFeed } from "./feed-filter.js";

function shop(over: Partial<ShopForFeed> = {}): ShopForFeed {
  const base: ShopForFeed = {
    id: "shop1",
    userId: "u1",
    name: "Test",
    coverImageUrl: null,
    category: "CARS",
    offersRepair: true,
    offersParts: false,
    offersTowing: false,
    repairRadiusKm: 10,
    partsRadiusKm: 20,
    towingRadiusKm: 8,
    partsNationwide: false,
    deliveryAvailable: false,
    carMakes: ["Toyota"],
    carYearMin: 1990,
    carYearMax: 2026,
    repairCategories: ["Engine"],
    partsCategories: [],
    rating: 4,
    reviewCount: 1,
    bidsWon: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: "u1",
      phone: "+9647000000000",
      email: null,
      firebaseUid: null,
      name: "S",
      userType: "SHOP",
      role: "USER",
      passwordHash: null,
      bannedAt: null,
      city: "Baghdad",
      districtId: "d1",
      address: null,
      fcmToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      district: { id: "d1", name: "Karrada", nameAr: "", city: "Baghdad", cityAr: "", lat: 33.31, lng: 44.42 },
    },
  };
  return { ...base, ...over, user: { ...base.user, ...over.user, district: over.user?.district ?? base.user.district } };
}

function post(over: Partial<PostForFeed> = {}): PostForFeed {
  const base: PostForFeed = {
    id: "p1",
    userId: "ou",
    serviceType: "REPAIR",
    category: "CARS",
    title: null,
    repairCategory: "Engine",
    partsCategory: null,
    carMake: "Toyota",
    carModel: null,
    carYear: 2015,
    conditionNew: false,
    conditionUsed: false,
    deliveryNeeded: false,
    towingFromLat: null,
    towingFromLng: null,
    towingFromAddress: null,
    towingToAddress: null,
    urgency: null,
    districtId: "d2",
    lat: 33.32,
    lng: 44.43,
    description: "test",
    photoUrls: [],
    status: "ACTIVE",
    expiresAt: new Date(Date.now() + 3600000),
    createdAt: new Date(),
    updatedAt: new Date(),
    district: { id: "d2", name: "Mansour", nameAr: "", city: "Baghdad", cityAr: "", lat: 33.34, lng: 44.36 },
    user: {
      id: "ou",
      phone: "+9647111111111",
      email: null,
      firebaseUid: null,
      name: "O",
      userType: "OWNER",
      role: "USER",
      passwordHash: null,
      bannedAt: null,
      city: null,
      districtId: null,
      address: null,
      fcmToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    bids: [],
  };
  return { ...base, ...over };
}

test("filterPostsForShop keeps post within repair radius", () => {
  const s = shop();
  const p = post();
  const out = filterPostsForShop(s, [p]);
  assert.equal(out.length, 1);
  assert.ok(out[0].distanceKm !== null);
});

test("filterPostsForShop drops post outside radius", () => {
  const s = shop({ repairRadiusKm: 1 });
  const p = post();
  const out = filterPostsForShop(s, [p]);
  assert.equal(out.length, 0);
});

test("filterPostsForShop parts nationwide bypasses distance", () => {
  const s = shop({
    offersRepair: false,
    offersParts: true,
    partsNationwide: true,
    repairCategories: [],
    partsCategories: ["Engine parts"],
  });
  const p = post({
    serviceType: "PARTS",
    repairCategory: null,
    partsCategory: "Engine parts",
    lat: 1,
    lng: 1,
  });
  const out = filterPostsForShop(s, [p]);
  assert.equal(out.length, 1);
  assert.equal(out[0].distanceKm, null);
});

test("moreFeedEntriesInShopCity lists same-city posts not in matched", () => {
  const s = shop({ repairRadiusKm: 50 });
  const matchedPost = post({ id: "m1", carMake: "Toyota" });
  const farSameCity = post({
    id: "x1",
    carMake: "Kia",
    lat: 35,
    lng: 45,
    district: {
      id: "d3",
      name: "Other",
      nameAr: "",
      city: "Baghdad",
      cityAr: "",
      lat: 35,
      lng: 45,
    },
  });
  const matched = filterPostsForShop(s, [matchedPost, farSameCity]);
  assert.equal(matched.length, 1);
  const more = moreFeedEntriesInShopCity(s, [matchedPost, farSameCity], matched);
  assert.equal(more.length, 1);
  assert.equal(more[0].id, "x1");
});

test("moreFeedEntriesInShopCity is empty when city cannot be resolved", () => {
  const base = shop();
  const s: ShopForFeed = {
    ...base,
    user: {
      ...base.user,
      city: null,
      district: null,
    },
  };
  const p = post();
  const matched = filterPostsForShop(s, [p]);
  const more = moreFeedEntriesInShopCity(s, [p], matched);
  assert.equal(more.length, 0);
});

test("moreFeedEntriesInShopCity uses district city when user.city missing", () => {
  const base = shop();
  const s = shop({
    user: { ...base.user, city: null, district: base.user.district },
    repairRadiusKm: 50,
    carMakes: ["Toyota"],
  });
  const kia = post({
    id: "k1",
    carMake: "Kia",
    lat: 35,
    lng: 45,
    district: {
      id: "d9",
      name: "Far",
      nameAr: "",
      city: "Baghdad",
      cityAr: "",
      lat: 35,
      lng: 45,
    },
  });
  const matched = filterPostsForShop(s, [kia]);
  assert.equal(matched.length, 0);
  const more = moreFeedEntriesInShopCity(s, [kia], matched);
  assert.equal(more.length, 1);
  assert.equal(more[0].id, "k1");
});

test("filterPostsForShop allows any repair category when shop repair list empty", () => {
  const s = shop({ repairCategories: [] });
  const p = post({ repairCategory: "Suspension" });
  const out = filterPostsForShop(s, [p]);
  assert.equal(out.length, 1);
});

test("moreFeedEntriesInShopCity matches city case-insensitively", () => {
  const base = shop();
  const s = shop({
    user: { ...base.user, city: "baghdad" },
    repairRadiusKm: 50,
    carMakes: ["Toyota"],
  });
  const p = post({
    id: "low",
    carMake: "Kia",
    district: { id: "d2", name: "M", nameAr: "", city: "Baghdad", cityAr: "", lat: 33.34, lng: 44.36 },
  });
  const matched = filterPostsForShop(s, [p]);
  assert.equal(matched.length, 0);
  const more = moreFeedEntriesInShopCity(s, [p], matched);
  assert.equal(more.length, 1);
});

test("buildMoreFeedEntries fills with national posts after same-city rows", () => {
  const s = shop({ repairRadiusKm: 1, carMakes: ["Toyota"] });
  const baghdadKia = post({
    id: "k1",
    carMake: "Kia",
    lat: 33.32,
    lng: 44.43,
    district: {
      id: "d2",
      name: "Mansour",
      nameAr: "",
      city: "Baghdad",
      cityAr: "",
      lat: 33.34,
      lng: 44.36,
    },
  });
  const basraToyota = post({
    id: "b1",
    carMake: "Toyota",
    lat: 30.5,
    lng: 47.8,
    district: {
      id: "bs",
      name: "Zubayr",
      nameAr: "",
      city: "Basra",
      cityAr: "",
      lat: 30.38,
      lng: 47.71,
    },
  });
  const matched = filterPostsForShop(s, [baghdadKia, basraToyota]);
  assert.equal(matched.length, 0);
  const { entries, cityMatchedCount } = buildMoreFeedEntries(s, [baghdadKia, basraToyota], matched);
  assert.equal(cityMatchedCount, 1);
  assert.equal(entries.length, 2);
  assert.ok(entries.some((e) => e.id === "b1"));
});
