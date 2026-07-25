type SectionBlockProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function SectionBlock({ title, subtitle, children }: SectionBlockProps) {
  return (
    <section className="section-block">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
