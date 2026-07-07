'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getTodayDateString,
  shouldAdvanceCycle,
  advanceCycle,
  initializeCycle,
  getTodayRoom,
  selectFeaturedTasks,
  AppConfig,
} from '@/lib/roomOfDay';
import { Room, COLOR_PALETTE, validateRoomName, getColorName } from '@/lib/rooms';

interface Chore {
  id: string;
  name: string;
  room_id: string | null;
  room: string; // Keep for backwards compatibility during migration
  status: 'pending' | 'done';
  due_next?: string;
  recurrence: 'daily' | 'weekly' | 'one-off';
  notes?: string;
}

interface CreateFormData {
  name: string;
  room_id: string | null;
  recurrence: 'daily' | 'weekly' | 'one-off';
  due_next?: string;
  notes?: string;
}

export default function Dashboard() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChore, setSelectedChore] = useState<Chore | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [confirmingDeleteRoomId, setConfirmingDeleteRoomId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<CreateFormData>({
    name: '',
    room_id: null,
    recurrence: 'weekly',
    due_next: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Room management
  const [showEditRoomsModal, setShowEditRoomsModal] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showEditRoom, setShowEditRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomFormData, setRoomFormData] = useState({ name: '', color: '#FFE600' });
  const [roomFormError, setRoomFormError] = useState<string | null>(null);

  // Room of the Day state
  const [roomOfDayState, setRoomOfDayState] = useState<AppConfig | null>(null);
  const [todayRoom, setTodayRoom] = useState<Room | null>(null);
  const [featuredTasks, setFeaturedTasks] = useState<Chore[]>([]);
  const [showRoomOverride, setShowRoomOverride] = useState(false);

  // View toggle state
  const [view, setView] = useState<'checklist' | 'rooms'>('checklist');

  useEffect(() => {
    // Load view preference from localStorage
    const savedView = localStorage.getItem('choreListView') as 'checklist' | 'rooms' | null;
    if (savedView) {
      setView(savedView);
    }
  }, []);

  useEffect(() => {
    // Save view preference to localStorage
    localStorage.setItem('choreListView', view);
  }, [view]);

  useEffect(() => {
    const init = async () => {
      const roomsData = await fetchRooms();
      await fetchChores();
      await fetchRoomOfDay(roomsData);
    };
    init();
  }, []);

  // Update featured tasks when room or chores change
  useEffect(() => {
    if (!todayRoom || chores.length === 0) {
      setFeaturedTasks([]);
      return;
    }

    const roomTasks = chores
      .filter((c) => c.room_id === todayRoom.id && c.status === 'pending')
      .sort((a, b) => {
        const aRecurring = a.recurrence !== 'one-off' ? 0 : 1;
        const bRecurring = b.recurrence !== 'one-off' ? 0 : 1;
        if (aRecurring !== bRecurring) return aRecurring - bRecurring;
        return new Date(a.id).getTime() - new Date(b.id).getTime();
      });

    const selected = selectFeaturedTasks(roomTasks, 5);
    setFeaturedTasks(selected);
  }, [todayRoom, chores]);

  // Auto-revert the delete confirmation after a few seconds of inactivity
  useEffect(() => {
    if (!confirmingDeleteId) return;
    const timeout = setTimeout(() => setConfirmingDeleteId(null), 6000);
    return () => clearTimeout(timeout);
  }, [confirmingDeleteId]);

  useEffect(() => {
    if (!confirmingDeleteRoomId) return;
    const timeout = setTimeout(() => setConfirmingDeleteRoomId(null), 6000);
    return () => clearTimeout(timeout);
  }, [confirmingDeleteRoomId]);

  // Reset the delete confirmation whenever the detail modal switches chores or closes
  useEffect(() => {
    setConfirmingDeleteId(null);
  }, [selectedChore?.id]);

  const fetchRooms = async (): Promise<Room[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      const roomsData = data || [];
      setRooms(roomsData);
      return roomsData;
    } catch (err) {
      console.error('Error fetching rooms:', err);
      return [];
    }
  };

  const fetchChores = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('chores')
        .select('*')
        .order('status', { ascending: true })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setChores(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chores');
      console.error('Error fetching chores:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomOfDay = async (roomsList: Room[]) => {
    try {
      if (roomsList.length < 2) {
        setTodayRoom(null);
        return;
      }

      const { data: config, error: configError } = await supabase
        .from('app_config')
        .select('*')
        .eq('owner', 'user')
        .single();

      if (configError) {
        const errorMsg = JSON.stringify(configError);
        if (errorMsg.includes('app_config') || errorMsg.includes('relation')) {
          return;
        }
        if (configError.code !== 'PGRST116') throw configError;
      }

      let appConfig = config as AppConfig | null;

      if (!appConfig) {
        const today = getTodayDateString();
        const { data: newConfig, error: insertError } = await supabase
          .from('app_config')
          .insert([{ owner: 'user', cycle_last_advanced_date: today }])
          .select()
          .single();

        if (insertError) {
          const errorMsg = JSON.stringify(insertError);
          if (errorMsg.includes('app_config')) return;
          throw insertError;
        }
        appConfig = newConfig as AppConfig;
      }

      // Build cycle from room IDs
      const roomIds = roomsList.map((r) => r.id);
      const storedCycle = appConfig.room_cycle || [];
      let { newCycle, newPointer } = initializeCycle(
        roomIds,
        storedCycle,
        appConfig.cycle_pointer || 0
      );
      const cycleWasRebuilt = JSON.stringify(newCycle) !== JSON.stringify(storedCycle);

      // Check if we need to advance the cycle (new day)
      const advancingToday = shouldAdvanceCycle(appConfig.cycle_last_advanced_date);
      if (advancingToday) {
        const advanced = advanceCycle(newCycle, newPointer);
        newCycle = advanced.newCycle;
        newPointer = advanced.newPointer;
      }

      // Persist whenever the cycle actually changed - either because the
      // room set no longer matched what was stored (e.g. rooms were
      // deleted/recreated, leaving stale or corrupted entries), or because
      // a new day rolled over. Without this, a rebuilt-but-unpersisted
      // cycle only lives in memory for the current render.
      if (cycleWasRebuilt || advancingToday) {
        await supabase
          .from('app_config')
          .update({
            room_cycle: newCycle,
            cycle_pointer: newPointer,
            cycle_last_advanced_date: getTodayDateString(),
          })
          .eq('owner', 'user');
      }

      // Determine today's room ID (considering override, guarded against a
      // stale override pointing at a since-deleted room)
      const todayRoomId = getTodayRoom(
        newCycle,
        newPointer,
        appConfig.display_override_date,
        appConfig.display_override_room,
        roomsList.map((r) => r.id)
      );

      // Find the room object
      const room = roomsList.find((r) => r.id === todayRoomId);

      // If an override was set but points at a room that no longer exists,
      // clear it in the DB so it doesn't keep dangling until the next
      // calendar-day rollover.
      const overrideIsStale =
        appConfig.display_override_room &&
        appConfig.display_override_date === getTodayDateString() &&
        !roomIds.includes(appConfig.display_override_room);
      if (overrideIsStale) {
        await supabase
          .from('app_config')
          .update({ display_override_date: null, display_override_room: null })
          .eq('owner', 'user');
      }

      setRoomOfDayState({
        ...appConfig,
        room_cycle: newCycle,
        cycle_pointer: newPointer,
        cycle_last_advanced_date: getTodayDateString(),
        display_override_date: overrideIsStale ? null : appConfig.display_override_date,
        display_override_room: overrideIsStale ? null : appConfig.display_override_room,
      });
      setTodayRoom(room || null);
    } catch (err) {
      console.error('Error fetching room of day:', err);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomFormError(null);

    const nameError = validateRoomName(roomFormData.name);
    if (nameError) {
      setRoomFormError(nameError);
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('rooms')
        .insert([{ name: roomFormData.name.trim(), color: roomFormData.color }]);

      if (insertError) throw insertError;

      const roomsData = await fetchRooms();
      await fetchRoomOfDay(roomsData);

      setRoomFormData({ name: '', color: '#FFE600' });
      setShowAddRoom(false);
    } catch (err) {
      setRoomFormError(err instanceof Error ? err.message : 'Failed to create room');
    }
  };

  const handleEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    setRoomFormError(null);

    const nameError = validateRoomName(roomFormData.name);
    if (nameError) {
      setRoomFormError(nameError);
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ name: roomFormData.name.trim(), color: roomFormData.color })
        .eq('id', editingRoom.id);

      if (updateError) throw updateError;

      const roomsData = await fetchRooms();
      await fetchRoomOfDay(roomsData);

      setRoomFormData({ name: '', color: '#FFE600' });
      setEditingRoom(null);
      setShowEditRoom(false);
    } catch (err) {
      setRoomFormError(err instanceof Error ? err.message : 'Failed to update room');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      // Clear any active override pointing at this room so it doesn't
      // dangle and silently break Room of the Day after deletion.
      if (roomOfDayState?.display_override_room === roomId) {
        await supabase
          .from('app_config')
          .update({ display_override_date: null, display_override_room: null })
          .eq('owner', 'user');
      }

      const { error: deleteError } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);

      if (deleteError) throw deleteError;

      const roomsData = await fetchRooms();
      await fetchChores();
      await fetchRoomOfDay(roomsData);
      setConfirmingDeleteRoomId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete room');
    }
  };

  const handleRoomOverride = async (roomId: string) => {
    try {
      const today = getTodayDateString();
      await supabase
        .from('app_config')
        .update({
          display_override_date: today,
          display_override_room: roomId,
        })
        .eq('owner', 'user');

      const room = rooms.find((r) => r.id === roomId);
      setTodayRoom(room || null);
      setShowRoomOverride(false);
    } catch (err) {
      console.error('Error setting room override:', err);
    }
  };

  const toggleDone = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const chore = chores.find((c) => c.id === id);
    if (!chore) return;

    const newStatus = chore.status === 'pending' ? 'done' : 'pending';

    try {
      const { error: updateError } = await supabase
        .from('chores')
        .update({ status: newStatus })
        .eq('id', id);

      if (updateError) throw updateError;

      setChores((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );
    } catch (err) {
      console.error('Error updating chore:', err);
      setError(err instanceof Error ? err.message : 'Failed to update chore');
    }
  };

  const handleRowClick = (chore: Chore, e: React.MouseEvent) => {
    if ((e.target as HTMLInputElement).type === 'checkbox') {
      return;
    }
    setSelectedChore(chore);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Chore name is required');
      return;
    }

    if (!formData.room_id) {
      setFormError('Room is required');
      return;
    }

    try {
      setCreating(true);

      if (editingChore) {
        const { error: updateError } = await supabase
          .from('chores')
          .update({
            name: formData.name.trim(),
            room_id: formData.room_id,
            recurrence: formData.recurrence,
            due_next: formData.due_next || null,
            notes: formData.notes || null,
          })
          .eq('id', editingChore.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('chores')
          .insert([
            {
              name: formData.name.trim(),
              room_id: formData.room_id,
              recurrence: formData.recurrence,
              due_next: formData.due_next || null,
              notes: formData.notes || null,
              status: 'pending',
            },
          ]);

        if (insertError) throw insertError;
      }

      await fetchChores();
      await fetchRoomOfDay(rooms);

      setFormData({ name: '', room_id: null, recurrence: 'weekly', due_next: '', notes: '' });
      setShowCreateForm(false);
      setEditingChore(null);
      setSelectedChore(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save chore');
      console.error('Error saving chore:', err);
    } finally {
      setCreating(false);
    }
  };

  const openEditForm = (chore: Chore) => {
    setEditingChore(chore);
    setFormData({
      name: chore.name,
      room_id: chore.room_id,
      recurrence: chore.recurrence,
      due_next: chore.due_next || '',
      notes: chore.notes || '',
    });
    setSelectedChore(null);
  };

  const handleDuplicate = async (chore: Chore) => {
    try {
      const { error: insertError } = await supabase
        .from('chores')
        .insert([
          {
            name: chore.name,
            room_id: chore.room_id,
            recurrence: chore.recurrence,
            due_next: chore.due_next || null,
            notes: chore.notes || null,
            status: 'pending',
          },
        ]);

      if (insertError) throw insertError;

      await fetchChores();
      setSelectedChore(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate chore');
      console.error('Error duplicating chore:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('chores')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchChores();
      setSelectedChore(null);
      setConfirmingDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chore');
      console.error('Error deleting chore:', err);
    }
  };

  const getRoomName = (roomId: string | null): string => {
    if (!roomId) return '(No room)';
    return rooms.find((r) => r.id === roomId)?.name || '(Unknown room)';
  };

  const sortedChores = [...chores].sort((a, b) => {
    if (a.status === 'pending' && b.status === 'done') return -1;
    if (a.status === 'done' && b.status === 'pending') return 1;
    return 0;
  });

  const pendingCount = chores.filter((c) => c.status === 'pending').length;
  const doneCount = chores.filter((c) => c.status === 'done').length;

  // Flex-wrap row layout: checkbox + name stay on one line, room/recurrence
  // wrap onto their own right-aligned line when the row is too narrow to fit
  // all four (fixes horizontal overflow on mobile viewports).
  const rowStyle = {
    display: 'flex' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    columnGap: 'var(--space-lg)',
    rowGap: 'var(--space-xs)',
  };
  const checkboxSlotStyle = {
    flex: '0 0 44px',
    display: 'flex' as const,
  };
  const nameSlotStyle = {
    flex: '0 1 auto',
    minWidth: '120px',
    maxWidth: '400px',
  };
  const metaSlotStyle = {
    flex: '0 0 auto',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'flex-start' as const,
    gap: 'var(--space-2xl)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)', paddingBlock: 'var(--space-3xl)', paddingInline: 'var(--gutter)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2xl)' }}>
        {/* Left: Title + Stats */}
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 var(--space-md) 0' }}>CHORE BOARD</h1>
          <p className="text-muted" style={{ margin: 0 }}>
            {pendingCount} pending · {doneCount} done
          </p>
        </div>

        {/* Right: Controls */}
        <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center' }}>
          {/* View Toggle - Tab Navigation */}
          <div style={{ display: 'flex', gap: 'var(--space-3xl)' }}>
            <button
              onClick={() => setView('checklist')}
              style={{
                padding: '0',
                paddingBottom: view === 'checklist' ? '4px' : '6px',
                fontSize: 'var(--text-body-sm)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wider)',
                border: 'none',
                borderBottom: view === 'checklist' ? '2px solid var(--color-voltage)' : 'none',
                background: 'transparent',
                color: 'var(--color-fg)',
                cursor: 'pointer',
                transition: 'border-color 160ms var(--ease-snap), padding-bottom 160ms var(--ease-snap)',
              }}
            >
              Checklist
            </button>
            <button
              onClick={() => setView('rooms')}
              style={{
                padding: '0',
                paddingBottom: view === 'rooms' ? '4px' : '6px',
                fontSize: 'var(--text-body-sm)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wider)',
                border: 'none',
                borderBottom: view === 'rooms' ? '2px solid var(--color-voltage)' : 'none',
                background: 'transparent',
                color: 'var(--color-fg)',
                cursor: 'pointer',
                transition: 'border-color 160ms var(--ease-snap), padding-bottom 160ms var(--ease-snap)',
              }}
            >
              Rooms
            </button>
          </div>

          {/* Edit Rooms Button */}
          <button
            onClick={() => setShowEditRoomsModal(true)}
            className="btn-primary"
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              fontSize: 'var(--text-body-sm)',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap',
            }}
          >
            Edit Rooms
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--color-mute)' }}>
          Loading chores...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card" style={{ borderColor: 'var(--color-glitch-red)', backgroundColor: 'var(--color-surface)' }}>
          <div style={{ color: 'var(--color-glitch-red)', fontWeight: 'bold', marginBottom: 'var(--space-sm)' }}>
            Error
          </div>
          <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)' }}>
            {error}
          </div>
        </div>
      )}

      {/* Room of the Day Section */}
      {!loading && rooms.length >= 2 && todayRoom && (
        <div className="card" style={{ borderColor: todayRoom.color, backgroundColor: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <div>
              <div style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)' }}>
                ROOM OF THE DAY
              </div>
              <h2 style={{ margin: '0', marginTop: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    backgroundColor: todayRoom.color,
                    borderRadius: '6px',
                    border: '1px solid var(--color-fg)',
                    flexShrink: 0,
                  }}
                />
                {todayRoom.name}
              </h2>
            </div>
            <button
              onClick={() => setShowRoomOverride(!showRoomOverride)}
              style={{
                background: 'none',
                border: '1px solid var(--color-fg-muted)',
                color: 'var(--color-fg)',
                padding: 'var(--space-sm) var(--space-md)',
                cursor: 'pointer',
                fontSize: 'var(--text-body-sm)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Change
            </button>
          </div>

          {/* Room override dropdown */}
          {showRoomOverride && (
            <div style={{ marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-lg)', borderBottom: '1px dashed var(--color-hairline)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {rooms
                  .filter((r) => r.id !== todayRoom.id)
                  .map((room) => (
                    <button
                      key={room.id}
                      onClick={() => handleRoomOverride(room.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-fg)',
                        textAlign: 'left',
                        padding: 'var(--space-sm)',
                        cursor: 'pointer',
                        fontSize: 'var(--text-body-md)',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: '12px',
                          height: '12px',
                          backgroundColor: room.color,
                          borderRadius: '6px',
                          marginRight: 'var(--space-sm)',
                        }}
                      />
                      → {room.name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Featured tasks */}
          {featuredTasks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {featuredTasks.map((chore) => (
                <div
                  key={chore.id}
                  onClick={(e) => handleRowClick(chore, e)}
                  style={{
                    ...rowStyle,
                    paddingBlock: 'var(--space-lg)',
                    paddingInline: 'var(--space-lg)',
                    borderBottom: '1px solid var(--color-surface-sunk)',
                    cursor: 'pointer',
                    transition: 'background-color 80ms linear',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface-sunk)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={checkboxSlotStyle}>
                    <input
                      type="checkbox"
                      checked={chore.status === 'done'}
                      onChange={(e) => toggleDone(chore.id, e as any)}
                      style={{
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        accentColor: todayRoom.color,
                      }}
                    />
                  </div>
                  <div style={{ ...nameSlotStyle, fontWeight: '500', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: '0' }}>
                    {chore.name}
                  </div>
                  <div style={{ flex: '1 0 auto' }}></div>
                  <div style={metaSlotStyle}>
                    <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)', textAlign: 'left', width: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getRoomName(chore.room_id)}
                    </div>
                    <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)', textTransform: 'capitalize', textAlign: 'left', width: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chore.recurrence}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)', textAlign: 'center', padding: 'var(--space-lg)' }}>
              No pending chores for {todayRoom.name} today
            </div>
          )}
        </div>
      )}

      {/* Room Management Section */}
      {view === 'rooms' && !loading && rooms.length > 0 && (
        <div className="card" style={{ backgroundColor: 'var(--color-surface)' }}>
          <h2 style={{ margin: '0 0 var(--space-lg) 0', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)' }}>
            ROOMS
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {rooms.map((room) => {
              const roomChoreCount = chores.filter((c) => c.room_id === room.id).length;
              return (
                <div
                  key={room.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-sm)',
                    padding: 'var(--space-sm) var(--space-md)',
                    borderBottom: '1px solid var(--color-surface-sunk)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          backgroundColor: room.color,
                          borderRadius: '6px',
                          border: '1px solid var(--color-fg)',
                        }}
                      />
                      <div>
                        <div style={{ fontSize: 'var(--text-body-md)' }}>{room.name}</div>
                        <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)' }}>
                          {roomChoreCount} chore{roomChoreCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      <button
                        onClick={() => {
                          setEditingRoom(room);
                          setRoomFormData({ name: room.name, color: room.color });
                          setShowEditRoom(true);
                        }}
                        style={{
                          padding: '4px 10px',
                          fontSize: 'var(--text-body-sm)',
                          fontFamily: 'var(--font-mono)',
                          border: '1px solid var(--color-fg-muted)',
                          borderRadius: '6px',
                          background: 'transparent',
                          color: 'var(--color-fg)',
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirmingDeleteRoomId === room.id) {
                            handleDeleteRoom(room.id);
                          } else {
                            setConfirmingDeleteRoomId(room.id);
                          }
                        }}
                        style={
                          confirmingDeleteRoomId === room.id
                            ? {
                                padding: '4px 10px',
                                fontSize: 'var(--text-body-sm)',
                                fontFamily: 'var(--font-mono)',
                                border: '1px solid var(--color-glitch-red)',
                                borderRadius: '6px',
                                backgroundColor: 'var(--color-glitch-red)',
                                color: 'var(--color-surface)',
                                cursor: 'pointer',
                              }
                            : {
                                padding: '4px 10px',
                                fontSize: 'var(--text-body-sm)',
                                fontFamily: 'var(--font-mono)',
                                border: '1px solid var(--color-glitch-red)',
                                borderRadius: '6px',
                                background: 'transparent',
                                color: 'var(--color-glitch-red)',
                                cursor: 'pointer',
                              }
                        }
                      >
                        {confirmingDeleteRoomId === room.id ? 'Confirm Delete?' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  {confirmingDeleteRoomId === room.id && (
                    <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-glitch-red)', textAlign: 'right' }}>
                      {roomChoreCount > 0
                        ? `${roomChoreCount} chore${roomChoreCount !== 1 ? 's' : ''} will be untagged. This cannot be undone.`
                        : 'This cannot be undone.'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && chores.length === 0 && rooms.length > 0 && (
        <div className="card" style={{ textAlign: 'center', paddingBlock: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>📋</div>
          <h2 style={{ marginBottom: 'var(--space-sm)' }}>No chores yet</h2>
          <p className="text-muted">Add your first chore to get started.</p>
        </div>
      )}

      {!loading && !error && rooms.length === 0 && (
        <div className="card" style={{ textAlign: 'center', paddingBlock: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>🏠</div>
          <h2 style={{ marginBottom: 'var(--space-sm)' }}>Create your first room</h2>
          <p className="text-muted">Rooms organize your chores. Click "+ Room" to get started.</p>
        </div>
      )}

      {/* Chore Checklist */}
      {view === 'checklist' && !loading && !error && sortedChores.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {/* Header Row */}
          <div
            style={{
              ...rowStyle,
              paddingBlock: 'var(--space-lg)',
              paddingInline: 'var(--space-lg)',
              borderBottom: 'var(--border-hairline)',
              fontSize: 'var(--text-label)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wider)',
              color: 'var(--color-fg-muted)',
              fontWeight: 'bold',
            }}
          >
            <div style={checkboxSlotStyle}></div>
            <div style={{ ...nameSlotStyle, textAlign: 'left', minWidth: '0' }}>CHORE</div>
            <div style={{ flex: '1 0 auto' }}></div>
            <div style={metaSlotStyle}>
              <div style={{ textAlign: 'left', width: '180px' }}>ROOM</div>
              <div style={{ textAlign: 'left', width: '120px' }}>RECURRENCE</div>
            </div>
          </div>

          {/* Chore Rows */}
          {sortedChores.map((chore) => {
            const choreRoom = rooms.find((r) => r.id === chore.room_id);
            return (
              <div
                key={chore.id}
                onClick={(e) => handleRowClick(chore, e)}
                style={{
                  ...rowStyle,
                  paddingBlock: 'var(--space-lg)',
                  paddingInline: 'var(--space-lg)',
                  borderBottom: '1px solid var(--color-surface-sunk)',
                  cursor: 'pointer',
                  transition: 'background-color 80ms linear',
                  backgroundColor: chore.status === 'done' ? 'var(--color-surface-sunk)' : 'transparent',
                  opacity: chore.status === 'done' ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (chore.status === 'pending') {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface-sunk)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (chore.status === 'pending') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={checkboxSlotStyle}>
                  <input
                    type="checkbox"
                    checked={chore.status === 'done'}
                    aria-label={`Mark ${chore.name} as ${chore.status === 'pending' ? 'done' : 'pending'}`}
                    onChange={(e) => toggleDone(chore.id, e as any)}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      accentColor: choreRoom?.color || 'var(--color-voltage)',
                    }}
                  />
                </div>

                <div
                  style={{
                    ...nameSlotStyle,
                    textDecoration: chore.status === 'done' ? 'line-through' : 'none',
                    fontWeight: chore.status === 'pending' ? '500' : '400',
                    textAlign: 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: '0',
                  }}
                >
                  {chore.name}
                </div>

                <div style={{ flex: '1 0 auto' }}></div>

                <div style={metaSlotStyle}>
                  <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', width: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {choreRoom && (
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          backgroundColor: choreRoom.color,
                          borderRadius: '6px',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    {getRoomName(chore.room_id)}
                  </div>

                  <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)', textTransform: 'capitalize', textAlign: 'left', width: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {chore.recurrence}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Chore CTA */}
      {!loading && !error && rooms.length > 0 && (
        <div style={{ textAlign: 'center', paddingTop: 'var(--space-xl)' }}>
          <button
            className="btn-primary"
            onClick={() => {
              setEditingChore(null);
              setFormData({ name: '', room_id: rooms[0]?.id || null, recurrence: 'weekly', due_next: '', notes: '' });
              setShowCreateForm(true);
            }}
            style={{ padding: 'var(--space-md) var(--space-xl)' }}
          >
            + Add a Chore
          </button>
        </div>
      )}

      {/* Edit Rooms Modal */}
      {showEditRoomsModal && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--color-backdrop)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-lg)',
          }}
          onClick={() => setShowEditRoomsModal(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowEditRoomsModal(false);
            }
          }}
        >
          <div
            className="card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-rooms-title"
            style={{ maxWidth: '500px', width: '100%', maxHeight: '80vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2 id="edit-rooms-title" style={{ margin: 0 }}>EDIT ROOMS</h2>
              <button
                onClick={() => setShowEditRoomsModal(false)}
                aria-label="Close edit rooms dialog"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--color-fg)',
                  padding: 0,
                  lineHeight: '1',
                }}
              >
                ✕
              </button>
            </div>

            {/* Add Room Button at top */}
            <button
              onClick={() => {
                setShowEditRoomsModal(false);
                setEditingRoom(null);
                setRoomFormData({ name: '', color: '#FFE600' });
                setShowAddRoom(true);
              }}
              className="btn-primary"
              style={{ width: '100%', marginBottom: 'var(--space-lg)', padding: 'var(--space-sm) var(--space-md)' }}
            >
              + Add Room
            </button>

            {/* Rooms List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {rooms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--color-fg-muted)' }}>
                  No rooms yet. Create one to get started.
                </div>
              ) : (
                rooms.map((room) => {
                  const roomChoreCount = chores.filter((c) => c.room_id === room.id).length;
                  return (
                    <div
                      key={room.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 'var(--space-md)',
                        border: '1px solid var(--color-hairline)',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: 'var(--color-surface)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flex: 1 }}>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            backgroundColor: room.color,
                            borderRadius: '6px',
                            border: '1px solid var(--color-fg)',
                            flexShrink: 0,
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: '500' }}>{room.name}</div>
                          <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)' }}>
                            {roomChoreCount} chore{roomChoreCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        <button
                          onClick={() => {
                            setEditingRoom(room);
                            setRoomFormData({ name: room.name, color: room.color });
                            setShowEditRoomsModal(false);
                            setShowEditRoom(true);
                          }}
                          aria-label={`Edit ${room.name}`}
                          style={{
                            padding: '4px 10px',
                            fontSize: 'var(--text-body-sm)',
                            fontFamily: 'var(--font-mono)',
                            border: '1px solid var(--color-fg-muted)',
                            borderRadius: '6px',
                            background: 'transparent',
                            color: 'var(--color-fg)',
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            const newRoom: Room = {
                              id: crypto.randomUUID(),
                              name: `${room.name} (copy)`,
                              color: room.color,
                              created_at: new Date().toISOString(),
                            };
                            setRooms([...rooms, newRoom]);
                            supabase.from('rooms').insert([newRoom]).then(() => fetchRooms());
                          }}
                          aria-label={`Duplicate ${room.name}`}
                          style={{
                            padding: '4px 10px',
                            fontSize: 'var(--text-body-sm)',
                            fontFamily: 'var(--font-mono)',
                            border: '1px solid var(--color-fg-muted)',
                            borderRadius: '6px',
                            background: 'transparent',
                            color: 'var(--color-fg)',
                            cursor: 'pointer',
                          }}
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteRoomId(room.id)}
                          aria-label={`Delete ${room.name}`}
                          style={{
                            padding: '4px 10px',
                            fontSize: 'var(--text-body-sm)',
                            fontFamily: 'var(--font-mono)',
                            border: confirmingDeleteRoomId === room.id ? '1px solid var(--color-glitch-red)' : '1px solid var(--color-fg-muted)',
                            borderRadius: '6px',
                            background: confirmingDeleteRoomId === room.id ? 'var(--color-glitch-red)' : 'transparent',
                            color: confirmingDeleteRoomId === room.id ? 'var(--color-surface)' : 'var(--color-fg)',
                            cursor: 'pointer',
                          }}
                        >
                          {confirmingDeleteRoomId === room.id ? 'Confirm?' : 'Delete'}
                        </button>
                      </div>

                      {/* Delete Confirmation Message */}
                      {confirmingDeleteRoomId === room.id && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: 'var(--text-body-sm)',
                            color: 'var(--color-glitch-red)',
                            whiteSpace: 'nowrap',
                            marginBottom: 'var(--space-sm)',
                          }}
                        >
                          Deletes all chores in this room.
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showAddRoom && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--color-backdrop)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-lg)',
          }}
          onClick={() => setShowAddRoom(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowAddRoom(false);
            }
          }}
        >
          <div
            className="card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-room-title"
            style={{ maxWidth: '400px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2 id="add-room-title" style={{ margin: 0 }}>ADD ROOM</h2>
              <button
                onClick={() => setShowAddRoom(false)}
                aria-label="Close add room dialog"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--color-fg)',
                  padding: 0,
                  lineHeight: '1',
                }}
              >
                ✕
              </button>
            </div>

            {roomFormError && (
              <div className="card" style={{ marginBottom: 'var(--space-lg)', borderColor: 'var(--color-glitch-red)', backgroundColor: 'var(--color-surface)' }}>
                <div style={{ color: 'var(--color-glitch-red)', fontSize: 'var(--text-body-sm)' }}>
                  {roomFormError}
                </div>
              </div>
            )}

            <form onSubmit={handleAddRoom} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  Room Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Kitchen"
                  value={roomFormData.name}
                  onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 13px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-body-md)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  <span>Color</span>
                  <span style={{ fontSize: 'var(--text-body-sm)', textTransform: 'none', letterSpacing: 'normal', color: 'var(--color-fg)' }}>
                    {getColorName(roomFormData.color)}
                  </span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-sm)' }}>
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setRoomFormData({ ...roomFormData, color: color.hex })}
                      title={color.name}
                      aria-label={color.name}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        backgroundColor: color.hex,
                        border: roomFormData.color === color.hex ? '3px solid var(--color-fg)' : '1px solid var(--color-fg-muted)',
                        cursor: 'pointer',
                        borderRadius: '6px',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-md)', paddingTop: 'var(--space-lg)', borderTop: '1px dashed var(--color-hairline)' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddRoom(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {showEditRoom && editingRoom && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--color-backdrop)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-lg)',
          }}
          onClick={() => setShowEditRoom(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowEditRoom(false);
            }
          }}
        >
          <div
            className="card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-room-title"
            style={{ maxWidth: '400px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2 id="edit-room-title" style={{ margin: 0 }}>EDIT ROOM</h2>
              <button
                onClick={() => setShowEditRoom(false)}
                aria-label="Close edit room dialog"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--color-fg)',
                  padding: 0,
                  lineHeight: '1',
                }}
              >
                ✕
              </button>
            </div>

            {roomFormError && (
              <div className="card" style={{ marginBottom: 'var(--space-lg)', borderColor: 'var(--color-glitch-red)', backgroundColor: 'var(--color-surface)' }}>
                <div style={{ color: 'var(--color-glitch-red)', fontSize: 'var(--text-body-sm)' }}>
                  {roomFormError}
                </div>
              </div>
            )}

            <form onSubmit={handleEditRoom} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomFormData.name}
                  onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 13px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-body-md)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  <span>Color</span>
                  <span style={{ fontSize: 'var(--text-body-sm)', textTransform: 'none', letterSpacing: 'normal', color: 'var(--color-fg)' }}>
                    {getColorName(roomFormData.color)}
                  </span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-sm)' }}>
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setRoomFormData({ ...roomFormData, color: color.hex })}
                      title={color.name}
                      aria-label={color.name}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        backgroundColor: color.hex,
                        border: roomFormData.color === color.hex ? '3px solid var(--color-fg)' : '1px solid var(--color-fg-muted)',
                        cursor: 'pointer',
                        borderRadius: '6px',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-md)', paddingTop: 'var(--space-lg)', borderTop: '1px dashed var(--color-hairline)' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEditRoom(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Chore Form Modal */}
      {(showCreateForm || editingChore) && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--color-backdrop)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-lg)',
          }}
          onClick={() => !creating && (setShowCreateForm(false), setEditingChore(null))}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !creating) {
              setShowCreateForm(false);
              setEditingChore(null);
            }
          }}
        >
          <div
            className="card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chore-form-title"
            style={{ maxWidth: '500px', width: '100%', maxHeight: '80vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2 id="chore-form-title" style={{ margin: 0 }}>{editingChore ? 'EDIT CHORE' : 'NEW CHORE'}</h2>
              <button
                onClick={() => !creating && (setShowCreateForm(false), setEditingChore(null))}
                aria-label={`Close ${editingChore ? 'edit' : 'create'} chore dialog`}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--color-fg)',
                  padding: 0,
                  lineHeight: '1',
                }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="card" style={{ marginBottom: 'var(--space-lg)', borderColor: 'var(--color-glitch-red)', backgroundColor: 'var(--color-surface)' }}>
                <div style={{ color: 'var(--color-glitch-red)', fontSize: 'var(--text-body-sm)' }}>
                  {formError}
                </div>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  Chore Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Wash dishes"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={creating}
                  style={{
                    width: '100%',
                    padding: '10px 13px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-body-md)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  Room *
                </label>
                <select
                  value={formData.room_id || ''}
                  onChange={(e) => setFormData({ ...formData, room_id: e.target.value || null })}
                  disabled={creating}
                  style={{
                    width: '100%',
                    padding: '10px 13px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-body-md)',
                    border: 'var(--border-hairline)',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-fg)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select a room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  Recurrence
                </label>
                <select
                  value={formData.recurrence}
                  onChange={(e) => setFormData({ ...formData, recurrence: e.target.value as 'daily' | 'weekly' | 'one-off' })}
                  disabled={creating}
                  style={{
                    width: '100%',
                    padding: '10px 13px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-body-md)',
                    border: 'var(--border-hairline)',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-fg)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="one-off">One-off</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  Due Next
                </label>
                <input
                  type="date"
                  value={formData.due_next}
                  onChange={(e) => setFormData({ ...formData, due_next: e.target.value })}
                  disabled={creating}
                  style={{
                    width: '100%',
                    padding: '10px 13px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-body-md)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  Notes
                </label>
                <textarea
                  placeholder="Add any instructions or context..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={creating}
                  style={{
                    width: '100%',
                    padding: '10px 13px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-body-md)',
                    minHeight: '80px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-md)', paddingTop: 'var(--space-lg)', borderTop: '1px dashed var(--color-hairline)' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => !creating && (setShowCreateForm(false), setEditingChore(null))}
                  disabled={creating}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={creating} style={{ flex: 1 }}>
                  {creating ? (editingChore ? 'Saving...' : 'Creating...') : (editingChore ? 'Save Changes' : 'Create Chore')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chore Detail Modal */}
      {selectedChore && !editingChore && !showCreateForm && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--color-backdrop)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-lg)',
          }}
          onClick={() => setSelectedChore(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSelectedChore(null);
            }
          }}
        >
          <div
            className="card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chore-detail-title"
            style={{ maxWidth: '500px', width: '100%', maxHeight: '80vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2 id="chore-detail-title" style={{ margin: 0 }}>{selectedChore.name}</h2>
              <button
                onClick={() => setSelectedChore(null)}
                aria-label="Close chore details"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--color-fg)',
                  padding: 0,
                  lineHeight: '1',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              <input
                type="checkbox"
                checked={selectedChore.status === 'done'}
                aria-label={`Mark ${selectedChore.name} as ${selectedChore.status === 'pending' ? 'done' : 'pending'}`}
                onChange={async (e) => {
                  const newStatus = selectedChore.status === 'pending' ? 'done' : 'pending';
                  try {
                    const { error: updateError } = await supabase
                      .from('chores')
                      .update({ status: newStatus })
                      .eq('id', selectedChore.id);

                    if (updateError) throw updateError;

                    setChores((prev) =>
                      prev.map((c) => (c.id === selectedChore.id ? { ...c, status: newStatus } : c))
                    );
                    setSelectedChore({ ...selectedChore, status: newStatus });
                  } catch (err) {
                    console.error('Error updating chore:', err);
                  }
                }}
                style={{
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  accentColor: rooms.find((r) => r.id === selectedChore.room_id)?.color || 'var(--color-voltage)',
                }}
              />
              <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)' }}>
                {selectedChore.status === 'pending' ? 'Mark as done' : 'Mark as pending'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  Room
                </label>
                <div style={{ fontSize: 'var(--text-body-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  {rooms.find((r) => r.id === selectedChore.room_id) && (
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: rooms.find((r) => r.id === selectedChore.room_id)?.color,
                        borderRadius: '6px',
                      }}
                    />
                  )}
                  {getRoomName(selectedChore.room_id)}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  Recurrence
                </label>
                <div style={{ fontSize: 'var(--text-body-md)', textTransform: 'capitalize' }}>{selectedChore.recurrence}</div>
              </div>

              {selectedChore.due_next && (
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                    Due Next
                  </label>
                  <div style={{ fontSize: 'var(--text-body-md)' }}>
                    {new Date(selectedChore.due_next).toLocaleDateString()}
                  </div>
                </div>
              )}

              {selectedChore.notes && (
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                    Notes
                  </label>
                  <div style={{ fontSize: 'var(--text-body-md)', fontFamily: 'var(--font-prose)', lineHeight: '1.7' }}>
                    {selectedChore.notes}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-2xl)', paddingTop: 'var(--space-lg)', borderTop: '1px dashed var(--color-hairline)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <button
                  className="btn-secondary"
                  onClick={() => openEditForm(selectedChore)}
                  aria-label={`Edit ${selectedChore.name}`}
                  style={{ flex: 1 }}
                >
                  Edit
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleDuplicate(selectedChore)}
                  aria-label={`Duplicate ${selectedChore.name}`}
                  style={{ flex: 1 }}
                >
                  Duplicate
                </button>
              </div>
              <button
                className="btn-secondary"
                onClick={() => {
                  if (confirmingDeleteId === selectedChore.id) {
                    handleDelete(selectedChore.id);
                  } else {
                    setConfirmingDeleteId(selectedChore.id);
                  }
                }}
                aria-label={confirmingDeleteId === selectedChore.id ? `Confirm delete ${selectedChore.name}` : `Delete ${selectedChore.name}`}
                style={
                  confirmingDeleteId === selectedChore.id
                    ? { backgroundColor: 'var(--color-glitch-red)', borderColor: 'var(--color-glitch-red)', color: 'var(--color-surface)' }
                    : { borderColor: 'var(--color-glitch-red)', color: 'var(--color-glitch-red)' }
                }
              >
                {confirmingDeleteId === selectedChore.id ? 'Confirm Delete?' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
