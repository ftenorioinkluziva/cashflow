-- Insert initial categories
INSERT INTO categories (name, description) VALUES
('Vendas', 'Receitas provenientes de vendas de produtos ou serviços'),
('Serviços', 'Receitas provenientes de prestação de serviços'),
('Investimentos', 'Receitas provenientes de investimentos financeiros'),
('Outros Recebimentos', 'Outras receitas não classificadas'),
('Instalações', 'Despesas com aluguel, condomínio, manutenção de instalações'),
('Utilidades', 'Despesas com água, luz, internet, telefone'),
('Impostos', 'Despesas com impostos e taxas governamentais'),
('Salários', 'Despesas com folha de pagamento e benefícios'),
('Marketing', 'Despesas com publicidade e marketing'),
('Equipamentos', 'Despesas com compra e manutenção de equipamentos'),
('Software', 'Despesas com licenças e assinaturas de software'),
('Viagens', 'Despesas com viagens corporativas'),
('Alimentação', 'Despesas com refeições e lanches'),
('Financeiras', 'Despesas com juros, tarifas bancárias e empréstimos'),
('Outras Despesas', 'Outras despesas não classificadas')
ON CONFLICT DO NOTHING;
