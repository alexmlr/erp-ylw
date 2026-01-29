
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { processImage } from '../../utils/imageProcessing';
import { loggerService } from '../../services/loggerService';
import { Save, Send, X, ArrowLeft, Camera, Trash2 } from 'lucide-react';
import styles from './Maintenance.module.css';

interface Unit { id: string; name: string; }
interface Category { id: string; name: string; }
interface Type { id: string; name: string; }
interface Attachment { id: string; file_name: string; storage_path: string; }

export const ServiceOrderForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { profile } = useAuth();

    // Form Data
    const [status, setStatus] = useState('Rascunho');
    const [serviceDate, setServiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [unitId, setUnitId] = useState('');
    const [priority, setPriority] = useState('Normal');
    const [categoryId, setCategoryId] = useState('');
    const [typeId, setTypeId] = useState('');
    const [description, setDescription] = useState('');

    // Auxiliary Data
    const [units, setUnits] = useState<Unit[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [types, setTypes] = useState<Type[]>([]);

    // Images
    const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
    const [newImages, setNewImages] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const isEditing = !!id;
    const isCommercial = !['admin', 'manager', 'administrative', 'Gestão', 'Administrador'].includes(profile?.role || '');
    // const canManageImages = ['Gestão', 'Administrador', 'admin', 'manager'].includes(profile?.role || '');

    // Read-only if: User is Commercial AND Status is NOT Rascunho implies it was sent.
    // Or generally provided in requirements: "ao enviar... nao pode mais editar nenhum campo"
    const isReadOnly = isCommercial && status !== 'Rascunho';

    useEffect(() => {
        loadAuxData();
        if (id) {
            loadOrder(id);
        } else {
            // New Order Defaults
            if (profile?.unit_id) setUnitId(profile.unit_id);
            setLoading(false);
        }
    }, [id, profile]);

    const loadAuxData = async () => {
        const [unitsRes, catsRes, typesRes] = await Promise.all([
            supabase.from('units').select('id, name').eq('active', true),
            supabase.from('maintenance_categories').select('id, name'),
            supabase.from('maintenance_types').select('id, name'),
        ]);

        if (unitsRes.data) setUnits(unitsRes.data);
        if (catsRes.data) setCategories(catsRes.data);
        if (typesRes.data) setTypes(typesRes.data);
    };

    const loadOrder = async (orderId: string) => {
        try {
            const { data, error } = await supabase
                .from('maintenance_orders')
                .select('*, maintenance_attachments(*)')
                .eq('id', orderId)
                .single();

            if (error) throw error;
            if (data) {
                setStatus(data.status);
                setServiceDate(data.service_date);
                setUnitId(data.unit_id);
                setPriority(data.priority);
                setCategoryId(data.category_id);
                setTypeId(data.type_id);
                setDescription(data.description || '');
                setExistingAttachments(data.maintenance_attachments || []);
            }
        } catch (err) {
            console.error(err);
            setError('Erro ao carregar OS.');
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setUploading(true);
            try {
                const processed = await Promise.all(files.map(f => processImage(f)));
                setNewImages(prev => [...prev, ...processed]);
            } catch (err) {
                alert('Erro ao processar imagem.');
                console.error(err);
            } finally {
                setUploading(false);
            }
        }
    };

    const removeNewImage = (index: number) => {
        setNewImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingAttachment = async (attachmentId: string, storagePath: string) => {
        if (!confirm('Deseja excluir esta imagem permanentemente?')) return;

        try {
            // Delete from Storage
            const { error: storageError } = await supabase.storage
                .from('maintenance-images')
                .remove([storagePath]);

            if (storageError) {
                console.error('Storage delete error', storageError);
                // Continue to delete from DB anyway if consistent? Or block?
                // Let's block to show error
                alert('Erro ao apagar arquivo do storage.');
                return;
            }

            // Delete from DB
            const { error: dbError } = await supabase
                .from('maintenance_attachments')
                .delete()
                .eq('id', attachmentId);

            if (dbError) throw dbError;

            setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir anexo.');
        }
    };

    const handleSubmit = async (targetStatus?: string) => {
        if (!unitId || !categoryId || !typeId || !description) {
            alert('Preencha os campos obrigatórios (*)');
            return;
        }

        setSaving(true);
        const finalStatus = targetStatus || status;

        try {
            // 1. Upsert Order
            const orderData = {
                unit_id: unitId,
                category_id: categoryId,
                type_id: typeId,
                priority,
                service_date: serviceDate,
                description,
                status: finalStatus,
                user_id: profile?.id
            };

            let orderId = id;

            if (isEditing) {
                const { error } = await supabase
                    .from('maintenance_orders')
                    .update(orderData)
                    .eq('id', id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('maintenance_orders')
                    .insert([orderData])
                    .select()
                    .single();
                if (error) throw error;
                orderId = data.id;
            }

            // 2. Upload New Images
            if (newImages.length > 0 && orderId) {
                for (const file of newImages) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const filePath = `os/${orderId}/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('maintenance-images')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { error: attachError } = await supabase
                        .from('maintenance_attachments')
                        .insert([{
                            order_id: orderId,
                            file_name: file.name,
                            storage_path: filePath,
                            file_size: file.size,
                            file_type: file.type
                        }]);

                    if (attachError) throw attachError;
                }
            }

            // 3. Logging & Notification
            const actionType = isEditing ? 'Atualizou OS' : 'Criou OS';
            await loggerService.logAction({
                action: actionType,
                entity: 'Ordem de Serviço',
                entity_id: orderId,
                details: { status: finalStatus, priority }
            });

            // Notify Admin/Gestão when status becomes 'Aberto' (Open)
            if (finalStatus === 'Aberto' && (status !== 'Aberto' || !isEditing)) {
                // Fetch recipients
                const { data: recipients } = await supabase
                    .from('profiles')
                    .select('id')
                    .in('role', ['admin', 'manager', 'Gestão', 'Administrador']);

                if (recipients && recipients.length > 0) {
                    const notifications = recipients.map(u => ({
                        user_id: u.id,
                        type: 'maintenance_alert',
                        title: 'Nova Ordem de Serviço',
                        message: `Nova OS criada/aberta por ${profile?.full_name || 'Usuário'}. Prioridade: ${priority}`,
                        link: `/maintenance/os/${orderId}` // Assuming there's a view or edit route
                    }));

                    // We can't bulk insert with createNotification helper as it takes one.
                    // But we can loop or use supabase insert directly. 
                    // Let's loop for now to use the service pattern or use supabase directly for bulk.
                    // Using supabase directly for efficiency:
                    await supabase.from('notifications').insert(notifications);
                }
            }

            navigate('/maintenance');
        } catch (err: any) {
            console.error(err);
            setError('Erro ao salvar OS: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6">Carregando...</div>;

    return (
        <div className={styles.container}>
            <button onClick={() => navigate('/maintenance')} className="flex items-center text-gray-600 mb-6 hover:text-gray-900">
                <ArrowLeft size={20} className="mr-2" />
                Voltar
            </button>

            <div className={styles.card}>
                <div className={styles.header} style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
                    <h1 className={styles.title}>
                        {isEditing ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
                    </h1>
                    {id && <span className="text-sm text-gray-500">ID: {id}</span>}
                </div>

                <div className={styles.formGrid}>
                    {/* Linha 1 */}
                    <div>
                        <label className={styles.formLabel}>Data (*)</label>
                        <input
                            type="date"
                            value={serviceDate}
                            onChange={e => setServiceDate(e.target.value)}
                            disabled={isReadOnly}
                            className={styles.input}
                            style={isReadOnly ? { backgroundColor: '#f3f4f6' } : {}}
                        />
                    </div>

                    <div>
                        <label className={styles.formLabel}>Status</label>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                            disabled={true} // Status is managed by buttons or admin workflow (usually not manually changed here by user except transitions)
                            // Ideally, only admins might change status manually, but for now let's lock it 
                            // as the requirements say "Status transitions (Rascunho -> Aberto)" happens via buttons.
                            // But maybe Managers can change it back? Let's check permissions.
                            // User requirement: "usuario pode editar... Rascunho". "enviada... nao pode mais editar".
                            // Let's stick to buttons for Rascunho->Aberto.
                            // Managers might want to close OS. Ideally they would have a specific action for that.
                            // For this form, let's keep it disabled for Commercial if not Rascunho (which is covered by logic below if we were consistent).
                            // But usually Status isn't a free edit field.
                            className={styles.input}
                            style={{ backgroundColor: '#f3f4f6' }}
                        >
                            <option value="Rascunho">Rascunho</option>
                            <option value="Aberto">Aberto</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Concluído">Concluído</option>
                        </select>
                    </div>

                    {/* Linha 2 */}
                    <div>
                        <label className={styles.formLabel}>Unidade (*)</label>
                        {isCommercial ? (
                            <input
                                type="text"
                                value={units.find(u => u.id === unitId)?.name || 'Carregando...'}
                                disabled
                                className={styles.input}
                                style={{ backgroundColor: '#f3f4f6' }}
                            />
                        ) : (
                            <select
                                value={unitId}
                                onChange={e => setUnitId(e.target.value)}
                                disabled={isReadOnly}
                                className={styles.input}
                                style={isReadOnly ? { backgroundColor: '#f3f4f6' } : {}}
                            >
                                <option value="">Selecione...</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        )}
                    </div>

                    <div>
                        <label className={styles.formLabel}>Solicitante</label>
                        <input
                            type="text"
                            value={profile?.full_name || 'Usuário'}
                            disabled
                            className={styles.input}
                            style={{ backgroundColor: '#f3f4f6' }}
                        />
                    </div>

                    {/* Linha 3 */}
                    <div>
                        <label className={styles.formLabel}>Prioridade (*)</label>
                        <select
                            value={priority}
                            onChange={e => setPriority(e.target.value)}
                            disabled={isReadOnly}
                            className={styles.input}
                            style={isReadOnly ? { backgroundColor: '#f3f4f6' } : {}}
                        >
                            <option value="Normal">Normal</option>
                            <option value="Urgente">Urgente</option>
                        </select>
                    </div>

                    <div>
                        <label className={styles.formLabel}>Categoria (*)</label>
                        <select
                            value={categoryId}
                            onChange={e => setCategoryId(e.target.value)}
                            disabled={isReadOnly}
                            className={styles.input}
                            style={isReadOnly ? { backgroundColor: '#f3f4f6' } : {}}
                        >
                            <option value="">Selecione...</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={styles.formLabel}>Tipo (*)</label>
                        <select
                            value={typeId}
                            onChange={e => setTypeId(e.target.value)}
                            disabled={isReadOnly}
                            className={styles.input}
                            style={isReadOnly ? { backgroundColor: '#f3f4f6' } : {}}
                        >
                            <option value="">Selecione...</option>
                            {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    {/* Observações */}
                    <div className={styles.colSpanFull}>
                        <label className={styles.formLabel}>Observações (*)</label>
                        <textarea
                            rows={4}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            disabled={isReadOnly}
                            className={styles.input}
                            placeholder="Detalhe o problema..."
                            style={isReadOnly ? { backgroundColor: '#f3f4f6' } : {}}
                        />
                    </div>

                    {/* Fotos */}
                    <div className={styles.colSpanFull}>
                        <label className={styles.formLabel}>Fotos</label>

                        <div className={styles.imageGrid}>
                            {/* Existing Images */}
                            {existingAttachments.map(att => (
                                <div key={att.id} className={styles.imagePreview}>
                                    <img
                                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/maintenance-images/${att.storage_path}`}
                                        alt={att.file_name}
                                    />
                                    {(!isReadOnly) && (
                                        <button
                                            onClick={() => removeExistingAttachment(att.id, att.storage_path)}
                                            className={styles.removeImageBtn}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}

                            {/* New Images Preview */}
                            {newImages.map((file, idx) => (
                                <div key={idx} className={styles.imagePreview} style={{ borderColor: '#ca8a04' }}>
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt="preview"
                                        style={{ opacity: 0.8 }}
                                    />
                                    <button
                                        onClick={() => removeNewImage(idx)}
                                        className={styles.removeImageBtn}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}

                            {/* Upload Button */}
                            {!isReadOnly && (
                                <label className={styles.uploadBox}>
                                    <Camera className="text-gray-400 mb-1" />
                                    <span className="text-xs text-gray-500">Adicionar</span>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageSelect}
                                        disabled={uploading}
                                    />
                                </label>
                            )}
                        </div>
                        {uploading && <p className="text-sm text-yellow-600 animate-pulse">Processando imagens...</p>}
                    </div>
                </div>

                <div className={styles.actionButtons}>
                    {error && <span className="text-red-600 text-sm self-center mr-auto">{error}</span>}

                    {!isReadOnly && (
                        <>
                            <button
                                onClick={() => handleSubmit('Rascunho')}
                                disabled={saving || uploading}
                                className={styles.secondaryButton}
                            >
                                <Save size={16} className="mr-2" />
                                Salvar Rascunho
                            </button>

                            <button
                                onClick={() => handleSubmit('Aberto')}
                                disabled={saving || uploading}
                                className={styles.primaryButton}
                            >
                                <Send size={16} className="mr-2" />
                                Enviar OS
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
