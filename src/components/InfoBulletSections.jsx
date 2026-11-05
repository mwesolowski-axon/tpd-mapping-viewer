function InfoBulletSections({ sections }) {
  if (!sections?.length) return null

  return (
    <div className="info-bullet-sections">
      {sections.map((section) => (
        <ul className="info-bullet-section-root" key={section.title}>
          <li>
            <span className="info-bullet-section-title">{section.title}</span>
            {section.items?.length > 0 && (
              <ul className="info-bullet-section-nested">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </li>
        </ul>
      ))}
    </div>
  )
}

export default InfoBulletSections
