"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";

type Stat = {
  value: number;
  display: (n: number) => string;
  label: string;
  suffix?: string;
};

const STATS: Stat[] = [
  { value: 10, display: (n) => String(Math.round(n)), label: "Model AI", suffix: "+" },
  { value: 1, display: (n) => String(Math.round(n)), label: "Konteks Maksimal", suffix: "M+" },
  { value: 100, display: (n) => `<${Math.round(n)}`, label: "Respons Cepat", suffix: "ms" },
  { value: 99.9, display: (n) => n.toFixed(1), label: "Keandalan", suffix: "%" },
];

function CountUp({ stat, delay }: { stat: Stat; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf: ReturnType<typeof requestAnimationFrame>;
    const start = performance.now();
    const duration = 1400;
    const animate = (ts: number) => {
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(stat.value * eased);
      if (p < 1) raf = requestAnimationFrame(animate);
      else setVal(stat.value);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [inView, stat.value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="relative text-center"
    >
      <div className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        {stat.display(val)}
        <span className="gradient-text-accent">{stat.suffix}</span>
      </div>
      <div className="mt-2 text-[13px] font-medium text-muted-foreground">{stat.label}</div>
    </motion.div>
  );
}

export function AnimatedStats() {
  return (
    <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
      {STATS.map((s, i) => (
        <CountUp key={s.label} stat={s} delay={i * 0.08} />
      ))}
    </div>
  );
}
