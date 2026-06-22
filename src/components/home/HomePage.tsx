import "@/styles/home-maquette.css";
import HomePageScroll from "./HomePageScroll";
import HomeNav from "./HomeNav";
import HomeHero from "./HomeHero";
import HomeTrust from "./HomeTrust";
import HomeFeatures from "./HomeFeatures";
import HomeShowcase from "./HomeShowcase";
import HomeHowItWorks from "./HomeHowItWorks";
import HomeStack from "./HomeStack";
import HomeCustomer from "./HomeCustomer";
import HomeCta from "./HomeCta";
import HomeFooter from "./HomeFooter";

export default function HomePage() {
  return (
    <HomePageScroll>
      <HomeNav />
      <HomeHero />
      <HomeTrust />
      <HomeFeatures />
      <HomeShowcase />
      <HomeHowItWorks />
      <HomeStack />
      <HomeCustomer />
      <HomeCta />
      <HomeFooter />
    </HomePageScroll>
  );
}
