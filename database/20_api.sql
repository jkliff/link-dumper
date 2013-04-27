DO $$
BEGIN
    perform 1
    from information_schema.schemata
    where schema_name = 'linkdump_api';

    if not found then
        create schema linkdump_api;
    end if;
END $$;

set search_path to linkdump_api;

create or replace function save_link (
    p_link_id   integer,
    p_url       text,
    p_notes     text,
    p_tags      text []
) returns integer AS
$BODY$

DECLARE
    l_link_id   integer;
    l_n         text;
BEGIN
    perform 1
    from linkdump_data.link
    where l_id = p_link_id;

    if not found then

        insert into linkdump_data.link (l_url, l_notes)
        values (p_url, p_notes)
        returning l_id
        into l_link_id;

    else
        update linkdump_data.link
        set l_url = p_url,
            l_notes = p_notes
        where l_id = p_link_id;

        l_link_id := p_link_id;

    end if;

    for l_n in

        select name
        from linkdump_data.tag
            right join (
                select name
                from unnest (p_tags) t (name)
            ) t on t.name = t_name
        where t_name is null
    loop
        insert into linkdump_data.tag (t_name) values (l_n);
    end loop;

    delete from linkdump_data.link_tag where lt_link_id = l_link_id;

    insert into linkdump_data.link_tag (lt_link_id, lt_tag_id)
    select l_link_id, t_id
    from (  select t_id
            from (
                select name
                from unnest (p_tags) t(name)
            ) t
                join linkdump_data.tag on t.name = t_name
                left join linkdump_data.link_tag on lt_tag_id = t_id
                    and lt_link_id = l_link_id
            where lt_tag_id is null
    ) t;

    return l_link_id;

END

$BODY$
language plpgsql
    volatile
    security definer;

reset search_path;