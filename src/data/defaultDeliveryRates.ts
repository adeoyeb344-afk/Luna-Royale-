/**
 * Official LUNA ROYALE Delivery Pricing Data
 * Imported from canonical logistics schedule.
 * All prices are in Nigerian Naira (NGN).
 *
 * Regions:
 * - lagos: 73 official Lagos delivery destinations
 * - interstate: GUO, Steve Nnam, LIBMOT / YONG SHALL GROW, Iyare Motors, Park Garage, etc.
 * - international: Quote required (no invented pricing)
 */

export interface DeliveryRate {
  id: string;
  region: 'lagos' | 'interstate' | 'international';
  destination: string;
  state?: string;
  courier: string;
  price: number | null; // null for quote-required international
  quoteRequired?: boolean;
  payOnArrivalAllowed?: boolean; // admin-configurable
  active: boolean;
  notes?: string;
}

export const DEFAULT_DELIVERY_RATES: DeliveryRate[] = [
  // =========================================================================
  // 1. LAGOS DELIVERY DESTINATIONS (Exact supplied prices)
  // =========================================================================
  { id: 'lagos-trade-fair', region: 'lagos', destination: 'Trade Fair', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 1500, active: true },
  { id: 'lagos-festac', region: 'lagos', destination: 'Festac', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-ago-palace', region: 'lagos', destination: 'Ago Palace', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-amuwo-odofin', region: 'lagos', destination: 'Amuwo Odofin', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-ojo', region: 'lagos', destination: 'Ojo', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-onipan', region: 'lagos', destination: 'Onipan', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-satellite-town', region: 'lagos', destination: 'Satellite Town', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-mile-2', region: 'lagos', destination: 'Mile 2', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-maza-maza', region: 'lagos', destination: 'Maza Maza', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-alaba-intl', region: 'lagos', destination: 'Alaba International', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-volt', region: 'lagos', destination: 'Volt', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-iyana-iba', region: 'lagos', destination: 'Iyana Iba', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-shomolu', region: 'lagos', destination: 'Shomolu', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-isolo', region: 'lagos', destination: 'Isolo', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-jakande', region: 'lagos', destination: 'Jakande', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-surulere', region: 'lagos', destination: 'Surulere', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-yaba', region: 'lagos', destination: 'Yaba', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-costain', region: 'lagos', destination: 'Costain', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-ebute-metta', region: 'lagos', destination: 'Ebute Metta', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-oshodi', region: 'lagos', destination: 'Oshodi', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-mushin', region: 'lagos', destination: 'Mushin', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-ejigbo', region: 'lagos', destination: 'Ejigbo', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-ajao-estate', region: 'lagos', destination: 'Ajao Estate', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-shogunle', region: 'lagos', destination: 'Shogunle', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-maryland', region: 'lagos', destination: 'Maryland', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-ijaniki', region: 'lagos', destination: 'Ijaniki', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-ikotun', region: 'lagos', destination: 'Ikotun', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-igando', region: 'lagos', destination: 'Igando', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4000, active: true },
  { id: 'lagos-ilupeju', region: 'lagos', destination: 'Ilupeju', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4500, active: true },
  { id: 'lagos-egbeda', region: 'lagos', destination: 'Egbeda', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 4500, active: true },
  { id: 'lagos-iyana-ipaja', region: 'lagos', destination: 'Iyana Ipaja', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-ogudu', region: 'lagos', destination: 'Ogudu', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-isheri-oshun', region: 'lagos', destination: 'Isheri Oshun', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-apapa', region: 'lagos', destination: 'Apapa', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-ajegunle', region: 'lagos', destination: 'Ajegunle', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-airport', region: 'lagos', destination: 'Airport', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-ikeja', region: 'lagos', destination: 'Ikeja', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-agege', region: 'lagos', destination: 'Agege', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-ogba', region: 'lagos', destination: 'Ogba', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-gbagada', region: 'lagos', destination: 'Gbagada', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-oworoshoki', region: 'lagos', destination: 'Oworoshoki', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-ikosi-ketu', region: 'lagos', destination: 'Ikosi Ketu', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-ketu-alapere', region: 'lagos', destination: 'Ketu Alapere', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-ijushaga', region: 'lagos', destination: 'Ijushaga', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-ojodu-berger', region: 'lagos', destination: 'Ojodu Berger', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-omole-1', region: 'lagos', destination: 'Omole Phase 1', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-omole-2', region: 'lagos', destination: 'Omole Phase 2', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-ajamgbadi', region: 'lagos', destination: 'Ajamgbadi', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-ipaja', region: 'lagos', destination: 'Ipaja', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-ayobo', region: 'lagos', destination: 'Ayobo', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-meiran', region: 'lagos', destination: 'Meiran', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-abule-egba', region: 'lagos', destination: 'Abule Egba', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-alakuko', region: 'lagos', destination: 'Alakuko', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-alagbado', region: 'lagos', destination: 'Alagbado', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-island', region: 'lagos', destination: 'Lagos Island', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-lekki-1', region: 'lagos', destination: 'Lekki Phase 1', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-vi', region: 'lagos', destination: 'Victoria Island', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-ikoyi', region: 'lagos', destination: 'Ikoyi', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-oniru', region: 'lagos', destination: 'Oniru', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-ologolo', region: 'lagos', destination: 'Ologolo', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-orchid-road', region: 'lagos', destination: 'Orchid Road', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-mile-12', region: 'lagos', destination: 'Mile 12', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-magodo-1', region: 'lagos', destination: 'Magodo Phase 1', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-magodo-2', region: 'lagos', destination: 'Magodo Phase 2', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-agbara', region: 'lagos', destination: 'Agbara', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-chevron', region: 'lagos', destination: 'Chevron', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 5000, active: true },
  { id: 'lagos-ikorodu', region: 'lagos', destination: 'Ikorodu', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 6000, active: true },
  { id: 'lagos-opic', region: 'lagos', destination: 'Opic', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 7000, active: true },
  { id: 'lagos-sangotedo', region: 'lagos', destination: 'Sangotedo', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 7000, active: true },
  { id: 'lagos-ajah', region: 'lagos', destination: 'Ajah', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 7000, active: true },
  { id: 'lagos-lakowe', region: 'lagos', destination: 'Lakowe', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 8000, active: true },
  { id: 'lagos-ibeju-lekki', region: 'lagos', destination: 'Ibeju Lekki', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 8000, active: true },
  { id: 'lagos-awoyaya', region: 'lagos', destination: 'Awoyaya', state: 'Lagos', courier: 'Standard Lagos Delivery', price: 8000, active: true },

  // =========================================================================
  // 2. INTERSTATE DESTINATIONS (GUO, Steve Nnam, LIBMOT/YONG SHALL GROW, Iyare, Park Garage)
  // =========================================================================

  // GUO — ₦3,500
  { id: 'guo-benin-3500', region: 'interstate', destination: 'Benin', state: 'Edo', courier: 'GUO', price: 3500, active: true },
  { id: 'guo-onitsha-3500', region: 'interstate', destination: 'Onitsha', state: 'Anambra', courier: 'GUO', price: 3500, active: true },

  // GUO — ₦5,000
  { id: 'guo-aba-5000', region: 'interstate', destination: 'Aba', state: 'Abia', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-abakaliki-5000', region: 'interstate', destination: 'Abakaliki', state: 'Ebonyi', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-afikpo-5000', region: 'interstate', destination: 'Afikpo', state: 'Ebonyi', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-asaba-5000', region: 'interstate', destination: 'Asaba', state: 'Delta', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-awka-5000', region: 'interstate', destination: 'Awka', state: 'Anambra', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-choba-5000', region: 'interstate', destination: 'Choba (Port Harcourt)', state: 'Rivers', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-ekwulobia-5000', region: 'interstate', destination: 'Ekwulobia', state: 'Anambra', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-enugu-5000', region: 'interstate', destination: 'Enugu', state: 'Enugu', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-gwarimpa-5000', region: 'interstate', destination: 'Gwarimpa (Abuja)', state: 'FCT Abuja', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-ihiala-5000', region: 'interstate', destination: 'Ihiala', state: 'Anambra', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-kubwa-5000', region: 'interstate', destination: 'Kubwa (Abuja)', state: 'FCT Abuja', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-mararaba-5000', region: 'interstate', destination: 'Mararaba', state: 'Nasarawa / Abuja', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-nnewi-5000', region: 'interstate', destination: 'Nnewi', state: 'Anambra', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-orlu-5000', region: 'interstate', destination: 'Orlu', state: 'Imo', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-owerri-5000', region: 'interstate', destination: 'Owerri', state: 'Imo', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-portharcourt-5000', region: 'interstate', destination: 'Port Harcourt', state: 'Rivers', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-umuahia-5000', region: 'interstate', destination: 'Umuahia', state: 'Abia', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-umunze-5000', region: 'interstate', destination: 'Umunze', state: 'Anambra', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-utako-5000', region: 'interstate', destination: 'Utako (Abuja)', state: 'FCT Abuja', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-wuse2-5000', region: 'interstate', destination: 'Wuse 2 (Abuja)', state: 'FCT Abuja', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-zuba-5000', region: 'interstate', destination: 'Zuba (Abuja)', state: 'FCT Abuja', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-ogoja-5000', region: 'interstate', destination: 'Ogoja', state: 'Cross River', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-uyo-5000', region: 'interstate', destination: 'Uyo', state: 'Akwa Ibom', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-calabar-5000', region: 'interstate', destination: 'Calabar', state: 'Cross River', courier: 'GUO', price: 5000, active: true },

  // GUO — ₦6,000
  { id: 'guo-bauchi-6000', region: 'interstate', destination: 'Bauchi', state: 'Bauchi', courier: 'GUO', price: 6000, active: true },
  { id: 'guo-jalingo-6000', region: 'interstate', destination: 'Jalingo', state: 'Taraba', courier: 'GUO', price: 6000, active: true },
  { id: 'guo-jos-6000', region: 'interstate', destination: 'Jos', state: 'Plateau', courier: 'GUO', price: 6000, active: true },
  { id: 'guo-kaduna-6000', region: 'interstate', destination: 'Kaduna', state: 'Kaduna', courier: 'GUO', price: 6000, active: true },
  { id: 'guo-kano-6000', region: 'interstate', destination: 'Kano', state: 'Kano', courier: 'GUO', price: 6000, active: true },
  { id: 'guo-yola-6000', region: 'interstate', destination: 'Yola', state: 'Adamawa', courier: 'GUO', price: 6000, active: true },
  { id: 'guo-zaria-6000', region: 'interstate', destination: 'Zaria', state: 'Kaduna', courier: 'GUO', price: 6000, active: true },

  // STEVE NNAM SMALL PACKAGE — ₦5,000
  { id: 'steve-asaba-5000', region: 'interstate', destination: 'Asaba', state: 'Delta', courier: 'Steve Nnam Small Package', price: 5000, active: true },
  { id: 'steve-agbor-5000', region: 'interstate', destination: 'Agbor', state: 'Delta', courier: 'Steve Nnam Small Package', price: 5000, active: true },
  { id: 'steve-ubulu-uku-5000', region: 'interstate', destination: 'Ubulu-Uku', state: 'Delta', courier: 'Steve Nnam Small Package', price: 5000, active: true },
  { id: 'steve-ozoro-5000', region: 'interstate', destination: 'Ozoro', state: 'Delta', courier: 'Steve Nnam Small Package', price: 5000, active: true },
  { id: 'steve-obiaruku-5000', region: 'interstate', destination: 'Obiaruku', state: 'Delta', courier: 'Steve Nnam Small Package', price: 5000, active: true },
  { id: 'steve-ibusa-5000', region: 'interstate', destination: 'Ibusa', state: 'Delta', courier: 'Steve Nnam Small Package', price: 5000, active: true },
  { id: 'steve-kwale-5000', region: 'interstate', destination: 'Kwale', state: 'Delta', courier: 'Steve Nnam Small Package', price: 5000, active: true },
  { id: 'steve-ogwashi-5000', region: 'interstate', destination: 'Ogwashi', state: 'Delta', courier: 'Steve Nnam Small Package', price: 5000, active: true },
  { id: 'steve-amai-5000', region: 'interstate', destination: 'Amai', state: 'Delta', courier: 'Steve Nnam Small Package', price: 5000, active: true },
  { id: 'steve-abraka-5000', region: 'interstate', destination: 'Abraka', state: 'Delta', courier: 'Steve Nnam Small Package', price: 5000, active: true },
  { id: 'steve-umunede-5000', region: 'interstate', destination: 'Umunede', state: 'Delta', courier: 'Steve Nnam Small Package', price: 5000, active: true },
  { id: 'steve-umutu-5000', region: 'interstate', destination: 'Umutu', state: 'Delta', courier: 'Steve Nnam Small Package', price: 5000, active: true },
  { id: 'steve-warri-5000', region: 'interstate', destination: 'Warri', state: 'Delta', courier: 'Steve Nnam Small Package', price: 5000, active: true },

  // LIBMOT / YONG SHALL GROW SMALL PACKAGE — ₦4,000
  { id: 'libmot-asaba-4000', region: 'interstate', destination: 'Asaba', state: 'Delta', courier: 'LIBMOT / YONG SHALL GROW Small Package', price: 4000, active: true },
  { id: 'libmot-warri-4000', region: 'interstate', destination: 'Warri', state: 'Delta', courier: 'LIBMOT / YONG SHALL GROW Small Package', price: 4000, active: true },
  { id: 'libmot-benin-4000', region: 'interstate', destination: 'Benin', state: 'Edo', courier: 'LIBMOT / YONG SHALL GROW Small Package', price: 4000, active: true },
  { id: 'libmot-enugu-4000', region: 'interstate', destination: 'Enugu', state: 'Enugu', courier: 'LIBMOT / YONG SHALL GROW Small Package', price: 4000, active: true },
  { id: 'libmot-abia-4000', region: 'interstate', destination: 'Abia', state: 'Abia', courier: 'LIBMOT / YONG SHALL GROW Small Package', price: 4000, active: true },
  { id: 'libmot-mbaise-4000', region: 'interstate', destination: 'Mbaise', state: 'Imo', courier: 'LIBMOT / YONG SHALL GROW Small Package', price: 4000, active: true },
  { id: 'libmot-owerri-4000', region: 'interstate', destination: 'Owerri', state: 'Imo', courier: 'LIBMOT / YONG SHALL GROW Small Package', price: 4000, active: true },
  { id: 'libmot-anara-4000', region: 'interstate', destination: 'Anara', state: 'Imo', courier: 'LIBMOT / YONG SHALL GROW Small Package', price: 4000, active: true },
  { id: 'libmot-awka-4000', region: 'interstate', destination: 'Awka', state: 'Anambra', courier: 'LIBMOT / YONG SHALL GROW Small Package', price: 4000, active: true },
  { id: 'libmot-ekwulobia-4000', region: 'interstate', destination: 'Ekwulobia', state: 'Anambra', courier: 'LIBMOT / YONG SHALL GROW Small Package', price: 4000, active: true },
  { id: 'libmot-nnewi-4000', region: 'interstate', destination: 'Nnewi', state: 'Anambra', courier: 'LIBMOT / YONG SHALL GROW Small Package', price: 4000, active: true },
  { id: 'libmot-portharcourt-4000', region: 'interstate', destination: 'Port Harcourt', state: 'Rivers', courier: 'LIBMOT / YONG SHALL GROW Small Package', price: 4000, active: true },

  // OTHER INTERSTATE ROUTES
  { id: 'iyare-benin-3000', region: 'interstate', destination: 'Benin City, Edo', state: 'Edo', courier: 'Iyare Motors', price: 3000, active: true },
  { id: 'interstate-auchi-3500', region: 'interstate', destination: 'Auchi', state: 'Edo', courier: 'Interstate Courier', price: 3500, active: true },
  { id: 'interstate-bayelsa-3000', region: 'interstate', destination: 'Bayelsa', state: 'Bayelsa', courier: 'Interstate Courier', price: 3000, active: true },
  { id: 'interstate-sapele-3000', region: 'interstate', destination: 'Sapele', state: 'Delta', courier: 'Interstate Courier', price: 3000, active: true },
  { id: 'interstate-ekpoma-3000', region: 'interstate', destination: 'Ekpoma', state: 'Edo', courier: 'Interstate Courier', price: 3000, active: true },
  { id: 'interstate-kogi-4000', region: 'interstate', destination: 'Kogi', state: 'Kogi', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-lokoja-4000', region: 'interstate', destination: 'Lokoja', state: 'Kogi', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-ibadan-3000', region: 'interstate', destination: 'Ibadan', state: 'Oyo', courier: 'Interstate Courier', price: 3000, active: true },
  { id: 'interstate-ibadan-challenge-3000', region: 'interstate', destination: 'Ibadan Challenge', state: 'Oyo', courier: 'Interstate Courier', price: 3000, active: true },
  { id: 'interstate-ibadan-iwo-3000', region: 'interstate', destination: 'Ibadan Iwo Road', state: 'Oyo', courier: 'Interstate Courier', price: 3000, active: true },

  // Park Garage Routes
  { id: 'park-abeokuta-4000', region: 'interstate', destination: 'Abeokuta', state: 'Ogun', courier: 'Park Garage', price: 4000, active: true },
  { id: 'park-ogun-4000', region: 'interstate', destination: 'Ogun State', state: 'Ogun', courier: 'Park Garage', price: 4000, active: true },
  { id: 'park-sango-otta-4000', region: 'interstate', destination: 'Sango Otta', state: 'Ogun', courier: 'Park Garage', price: 4000, active: true },
  { id: 'park-mowe-4000', region: 'interstate', destination: 'Mowe', state: 'Ogun', courier: 'Park Garage', price: 4000, active: true },
  { id: 'park-ado-ekiti-4000', region: 'interstate', destination: 'Ado-Ekiti', state: 'Ekiti', courier: 'Park Garage', price: 4000, active: true },
  { id: 'park-osogbo-4000', region: 'interstate', destination: 'Osogbo', state: 'Osun', courier: 'Park Garage', price: 4000, active: true },
  { id: 'park-ile-ife-4000', region: 'interstate', destination: 'Ile Ife', state: 'Osun', courier: 'Park Garage', price: 4000, active: true },
  { id: 'park-ede-4000', region: 'interstate', destination: 'Ede', state: 'Osun', courier: 'Park Garage', price: 4000, active: true },
  { id: 'park-akure-4000', region: 'interstate', destination: 'Akure', state: 'Ondo', courier: 'Park Garage', price: 4000, active: true },
  { id: 'park-ogbomosho-4000', region: 'interstate', destination: 'Ogbomosho', state: 'Oyo', courier: 'Park Garage', price: 4000, active: true },

  // Additional Interstate
  { id: 'interstate-ekiti-4000', region: 'interstate', destination: 'Ekiti', state: 'Ekiti', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-awo-ekiti-4000', region: 'interstate', destination: 'Awo-Ekiti', state: 'Ekiti', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-ikole-4000', region: 'interstate', destination: 'Ikole', state: 'Ekiti', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-ijero-4000', region: 'interstate', destination: 'Ijero', state: 'Ekiti', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-ipoti-4000', region: 'interstate', destination: 'Ipoti', state: 'Ekiti', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-ilorin-4000', region: 'interstate', destination: 'Ilorin', state: 'Kwara', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-ogun-4000', region: 'interstate', destination: 'Ogun State', state: 'Ogun', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-oyo-3000', region: 'interstate', destination: 'Oyo', state: 'Oyo', courier: 'Interstate Courier', price: 3000, active: true },
  { id: 'interstate-ilaro-4000', region: 'interstate', destination: 'Ilaro', state: 'Ogun', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-arepo-4000', region: 'interstate', destination: 'Arepo', state: 'Ogun', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-itori-4000', region: 'interstate', destination: 'Itori', state: 'Ogun', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-magboro-4000', region: 'interstate', destination: 'Magboro', state: 'Ogun', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-oju-ore-4000', region: 'interstate', destination: 'Oju Ore', state: 'Ogun', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-igbesa-4000', region: 'interstate', destination: 'Igbesa', state: 'Ogun', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-sagamu-4000', region: 'interstate', destination: 'Sagamu', state: 'Ogun', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-aiyetoro-4000', region: 'interstate', destination: 'Aiyetoro', state: 'Ogun', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-agbara-ogun-4000', region: 'interstate', destination: 'Agbara (Ogun)', state: 'Ogun', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-ijebu-ode-4000', region: 'interstate', destination: 'Ijebu Ode', state: 'Ogun', courier: 'Interstate Courier', price: 4000, active: true },
  { id: 'interstate-makurdi-5000', region: 'interstate', destination: 'Makurdi (Benue)', state: 'Benue', courier: 'Interstate Courier', price: 5000, active: true },

  // GUO Abuja Specific Hubs
  { id: 'guo-abuja-utako-5000', region: 'interstate', destination: 'GUO Abuja Utako', state: 'FCT Abuja', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-abuja-zuba-5000', region: 'interstate', destination: 'GUO Abuja Zuba', state: 'FCT Abuja', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-abuja-mararaba-5000', region: 'interstate', destination: 'GUO Abuja Mararaba', state: 'FCT Abuja', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-abuja-gwarimpa-5000', region: 'interstate', destination: 'GUO Abuja Gwarimpa', state: 'FCT Abuja', courier: 'GUO', price: 5000, active: true },
  { id: 'guo-abuja-kubwa-5000', region: 'interstate', destination: 'GUO Abuja Kubwa', state: 'FCT Abuja', courier: 'GUO', price: 5000, active: true },

  // Additional Northern & Western States
  { id: 'interstate-yobe-5000', region: 'interstate', destination: 'Yobe', state: 'Yobe', courier: 'Interstate Courier', price: 5000, active: true },
  { id: 'interstate-katsina-5000', region: 'interstate', destination: 'Katsina', state: 'Katsina', courier: 'Interstate Courier', price: 5000, active: true },
  { id: 'interstate-kaduna-5000', region: 'interstate', destination: 'Kaduna', state: 'Kaduna', courier: 'Interstate Courier', price: 5000, active: true },
  { id: 'interstate-zamfara-5000', region: 'interstate', destination: 'Zamfara', state: 'Zamfara', courier: 'Interstate Courier', price: 5000, active: true },
  { id: 'interstate-nasarawa-5000', region: 'interstate', destination: 'Nasarawa', state: 'Nasarawa', courier: 'Interstate Courier', price: 5000, active: true },
  { id: 'interstate-kebbi-5000', region: 'interstate', destination: 'Kebbi', state: 'Kebbi', courier: 'Interstate Courier', price: 5000, active: true },

  // =========================================================================
  // 3. INTERNATIONAL DESTINATIONS (Quote Required — No invented prices)
  // =========================================================================
  { id: 'intl-ghana', region: 'international', destination: 'Ghana', courier: 'International Courier Service', price: null, quoteRequired: true, active: true, notes: 'Logistics quote required' },
  { id: 'intl-cotonou', region: 'international', destination: 'Cotonou', courier: 'International Courier Service', price: null, quoteRequired: true, active: true, notes: 'Logistics quote required' },
  { id: 'intl-liberia', region: 'international', destination: 'Liberia', courier: 'International Courier Service', price: null, quoteRequired: true, active: true, notes: 'Logistics quote required' },
  { id: 'intl-egypt', region: 'international', destination: 'Egypt', courier: 'International Courier Service', price: null, quoteRequired: true, active: true, notes: 'Logistics quote required' },
  { id: 'intl-usa', region: 'international', destination: 'USA', courier: 'International Courier Service', price: null, quoteRequired: true, active: true, notes: 'Logistics quote required' },
  { id: 'intl-uk', region: 'international', destination: 'UK', courier: 'International Courier Service', price: null, quoteRequired: true, active: true, notes: 'Logistics quote required' },
  { id: 'intl-other', region: 'international', destination: 'Other international destinations', courier: 'International Courier Service', price: null, quoteRequired: true, active: true, notes: 'Logistics quote required' },
];
