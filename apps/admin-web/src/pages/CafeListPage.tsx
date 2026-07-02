import { adminCafeApi } from "../api/adminCafeApi";
import { useAsync } from "../features/useAsync";
import { AdminLayout } from "./AdminLayout";
import { formatDateTime, statusLabel } from "./pageUtils";

export function CafeListPage() {
  const cafesState = useAsync(() => adminCafeApi.listCafes());

  return (
    <AdminLayout
      title="Cafes"
      actions={
        <a className="button primary" href="/admin/cafes/new">
          Add Cafe
        </a>
      }
    >
      {cafesState.isLoading ? <section className="state-panel">Loading cafes...</section> : null}

      {cafesState.error ? (
        <section className="state-panel error">
          <h2>Unable to load cafes</h2>
          <p>{cafesState.error}</p>
        </section>
      ) : null}

      {!cafesState.isLoading && !cafesState.error && cafesState.data?.cafes.length === 0 ? (
        <section className="state-panel">
          <h2>No cafes yet</h2>
          <p>Create a cafe before printing QR posters or accepting redemptions.</p>
          <a className="button primary" href="/admin/cafes/new">
            Add Cafe
          </a>
        </section>
      ) : null}

      {cafesState.data && cafesState.data.cafes.length > 0 ? (
        <section className="table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Area</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cafesState.data.cafes.map((cafe) => (
                  <tr key={cafe.cafeId}>
                    <td data-label="Name">
                      <strong>{cafe.name}</strong>
                    </td>
                    <td data-label="Area">{cafe.area}</td>
                    <td data-label="City">{cafe.city}</td>
                    <td data-label="Status">
                      <span className={`status ${cafe.status}`}>{statusLabel(cafe.status)}</span>
                    </td>
                    <td data-label="Created">{formatDateTime(cafe.createdAt)}</td>
                    <td data-label="Action">
                      <a className="text-link" href={`/admin/cafes/${encodeURIComponent(cafe.cafeId)}`}>
                        View details
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </AdminLayout>
  );
}

