import './PhotoGallery.css'

export default function PhotoGallery() {
  return (
    <section id="photos" className="photos section">
      <div className="section-inner">
        <p className="section-label">Photos</p>
        <h2 className="photos-heading">A family album, coming soon</h2>
        <div className="photos-placeholder">
          <p>
            Family members will be able to upload their favorite photos of Ba
            here — birthdays, kitchens, gardens, gatherings, everyday moments.
          </p>
          <p className="photos-phase-b">
            Gallery + bulk upload launches in the next phase.
          </p>
        </div>
      </div>
    </section>
  )
}
