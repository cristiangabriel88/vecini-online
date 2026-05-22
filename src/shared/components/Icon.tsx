import {
  AlertCircle, Baby, BadgeCheck, BarChart3, BellRing, Bike, BookA, BookOpen, Box, Building2,
  Cake, Calculator, CalendarClock, CalendarDays, CalendarRange, Car, CarFront, Contact, DoorOpen,
  Droplet, EyeOff, FileSignature, FileSpreadsheet, FileText, FireExtinguisher, Flame, Gauge, Gavel,
  Gift, HandCoins, Handshake, HardHat, Heart, HelpCircle, Images, KanbanSquare, KeyRound, KeySquare,
  Lightbulb, ListOrdered, Lock, Map, Megaphone, MessageCircle, MessageSquarePlus, MessagesSquare,
  PartyPopper, PawPrint, PhoneCall, PiggyBank, Repeat, Repeat2, ScrollText, ShieldCheck, ShoppingBag,
  ShoppingCart, Siren, Sprout, StickyNote, ToyBrick, Truck, Umbrella, UserSearch, Vote,
  WashingMachine, Wrench, Zap,
  type LucideIcon, type LucideProps,
} from 'lucide-react';

const REGISTRY: Record<string, LucideIcon> = {
  AlertCircle, Baby, BadgeCheck, BarChart3, BellRing, Bike, BookA, BookOpen, Box, Building2,
  Cake, Calculator, CalendarClock, CalendarDays, CalendarRange, Car, CarFront, Contact, DoorOpen,
  Droplet, EyeOff, FileSignature, FileSpreadsheet, FileText, FireExtinguisher, Flame, Gauge, Gavel,
  Gift, HandCoins, Handshake, HardHat, Heart, HelpCircle, Images, KanbanSquare, KeyRound, KeySquare,
  Lightbulb, ListOrdered, Lock, Map, Megaphone, MessageCircle, MessageSquarePlus, MessagesSquare,
  PartyPopper, PawPrint, PhoneCall, PiggyBank, Repeat, Repeat2, ScrollText, ShieldCheck, ShoppingBag,
  ShoppingCart, Siren, Sprout, StickyNote, ToyBrick, Truck, Umbrella, UserSearch, Vote,
  WashingMachine, Wrench, Zap,
};

/** Render a lucide icon by its name (as stored in the feature registry). */
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = REGISTRY[name] ?? HelpCircle;
  return <Cmp {...props} />;
}
