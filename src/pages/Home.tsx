import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ScrollFilm } from '@/components/background/ScrollFilm';
import { Hero } from '@/components/sections/Hero';
import { Interlude } from '@/components/sections/Interlude';
import { Manifesto } from '@/components/sections/Manifesto';
import { Services } from '@/components/sections/Services';
import { Ritual } from '@/components/sections/Ritual';
import { Team } from '@/components/sections/Team';
import { Styles } from '@/components/sections/Styles';
import { Space } from '@/components/sections/Space';
import { Club } from '@/components/sections/Club';
import { Reviews } from '@/components/sections/Reviews';
import { Location } from '@/components/sections/Location';
import { Faq } from '@/components/sections/Faq';
import { FinalCta } from '@/components/sections/FinalCta';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

// Narrative order follows the film: arrival → chair → counter → tools close-up.
// Transparent "windows" (Interlude, Space, FinalCta) let the film take the stage between sheets.
export default function Home() {
  useDocumentTitle();
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 60);
    return () => clearTimeout(t);
  }, [hash]);

  return (
    <>
      <ScrollFilm />
      <main id="conteudo" className="relative">
        <Hero />
        <Interlude chapter="II" label="A cadeira" lines={['Toda noite começa', <span key="b" className="brass-text">com uma cadeira vazia.</span>]} />
        <Manifesto />
        <Services />
        <Interlude chapter="✦" label="Entre um corte e outro" lines={['Ferramentas afiadas,', <span key="b" className="brass-text">tempo de sobra.</span>]} height="min-h-[70svh]" />
        <Ritual />
        <Team />
        <Styles />
        <Space />
        <Club />
        <div className="h-[30svh]" aria-hidden="true" />
        <Location />
        <Reviews />
        <Faq />
        <FinalCta />
      </main>
    </>
  );
}
