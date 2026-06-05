// ================================================================
// lib/supabase.ts ලා registerCustomer function REPLACE කරන්න
// ================================================================

export async function registerCustomer(
  email: string,
  password: string,
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    city: string;
    nic: string;           // ← FIX: nic field
    drivingLicense: string; // ← FIX: driving_license field
  }
): Promise<{ data: DbCustomer | null; error: string | null }> {
  try {
    // Check email exists
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      return { data: null, error: 'Email already registered' };
    }

    // Hash password
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert with ALL fields including nic and driving_license
    const { data, error } = await supabase
      .from('customers')
      .insert({
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        first_name: profile.firstName.trim(),
        last_name: profile.lastName.trim(),
        phone: profile.phone.trim(),
        city: profile.city,
        nic: profile.nic.trim(),           // ← SAVE NIC
        driving_license: profile.drivingLicense.trim(), // ← SAVE LICENSE
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };

  } catch (err: any) {
    return { data: null, error: err.message || 'Registration failed' };
  }
}

// ================================================================
// registerOwner function ලාත් password hash කරන්න
// ================================================================

export async function registerOwner(
  email: string,
  password: string,
  profile: {
    shopName: string;
    ownerName: string;
    phone: string;
    whatsapp: string;
    city: string;
    agreement_accepted?: boolean;
    agreement_accepted_at?: string;
  }
): Promise<{ data: DbOwner | null; error: string | null }> {
  try {
    const { data: existing } = await supabase
      .from('owners')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      return { data: null, error: 'Email already registered' };
    }

    // Hash password
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    const { data, error } = await supabase
      .from('owners')
      .insert({
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        shop_name: profile.shopName.trim(),
        owner_name: profile.ownerName.trim(),
        phone: profile.phone.trim(),
        whatsapp: profile.whatsapp.trim(),
        city: profile.city,
        agreement_accepted: profile.agreement_accepted || false,
        agreement_accepted_at: profile.agreement_accepted_at || null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };

  } catch (err: any) {
    return { data: null, error: err.message || 'Registration failed' };
  }
}